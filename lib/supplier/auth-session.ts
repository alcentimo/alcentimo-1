import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  isAuthEmailVerified,
} from "@/lib/auth/email-verified";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isExistingUserError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists") ||
    normalized.includes("duplicate")
  );
}

/** Localiza usuario Auth por id (sin side-effects de generateLink). */
export async function lookupAuthUserById(
  userId: string,
): Promise<User | null> {
  const id = userId.trim();
  if (!id) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Localiza usuario Auth por email.
 * Preferir getUserById cuando haya supplier_profiles.user_id.
 * generateLink se usa solo como fallback de descubrimiento.
 */
export async function lookupAuthUserByEmail(
  email: string,
): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });

  if (error || !data.user) return null;
  return data.user;
}

/**
 * Resuelve el usuario Auth vinculado al perfil proveedor.
 * Si el user_id del perfil está desfasado (p. ej. cuenta cliente recreada),
 * repara supplier_profiles.user_id hacia el Auth actual del correo.
 */
export async function resolveAuthUserForSupplierProfile(input: {
  profileUserId: string;
  email: string;
}): Promise<
  | { ok: true; user: User; repairedUserId?: string }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  const byId = await lookupAuthUserById(input.profileUserId);
  if (byId && normalizeEmail(byId.email ?? "") === email) {
    return { ok: true, user: byId };
  }

  const byEmail = await lookupAuthUserByEmail(email);
  if (!byEmail) {
    return {
      ok: false,
      error:
        "No se pudo vincular el correo a la cuenta de proveedor. Intenta de nuevo.",
    };
  }

  if (byId && byId.id === byEmail.id) {
    return { ok: true, user: byEmail };
  }

  // Perfil apunta a otro user_id (o inexistente): alinear con Auth del correo.
  if (byEmail.id !== input.profileUserId) {
    const repaired = await repairSupplierProfileUserId({
      email,
      userId: byEmail.id,
      previousUserId: input.profileUserId,
    });
    if (!repaired.ok) return repaired;
    return { ok: true, user: byEmail, repairedUserId: byEmail.id };
  }

  return { ok: true, user: byEmail };
}

async function repairSupplierProfileUserId(input: {
  email: string;
  userId: string;
  previousUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const escapedEmail = input.email
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  const payload = {
    user_id: input.userId,
    email: input.email,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from("supplier_profiles")
    .update(payload)
    .ilike("email", escapedEmail);

  if (error) {
    const { error: byIdError } = await db
      .from("supplier_profiles")
      .update(payload)
      .eq("user_id", input.previousUserId);

    if (byIdError) {
      console.error("[supplier-profile-userid-repair]", byIdError.message);
      return {
        ok: false,
        error:
          "No se pudo sincronizar tu cuenta de proveedor con el acceso. Contacta soporte.",
      };
    }
  }

  console.warn("[supplier-profile-userid-repair]", {
    email: input.email,
    from: input.previousUserId,
    to: input.userId,
  });

  return { ok: true };
}

export type SupplierSessionPrepResult =
  | {
      ok: true;
      tokenHash: string;
      redirectTo: string;
      email: string;
    }
  | { ok: false; error: string };

/**
 * Prepara un token de sesión para el panel proveedor sin setear cookies
 * en el Server Action (evita "Unexpected response" en el cliente).
 * El cliente debe llamar verifyOtp(token_hash) y luego navegar a redirectTo.
 */
export async function prepareSupplierSessionToken(input: {
  email: string;
  redirectTo: string;
}): Promise<SupplierSessionPrepResult> {
  const normalized = normalizeEmail(input.email);
  const admin = createAdminClient();

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
    });

  if (linkError || !linkData.user) {
    return {
      ok: false,
      error: formatAuthError(
        linkError?.message ?? "No se pudo preparar la sesión de proveedor.",
      ),
    };
  }

  if (!isAuthEmailVerified(linkData.user)) {
    return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
  }

  const tokenHash = linkData.properties?.hashed_token?.trim();
  if (!tokenHash) {
    return {
      ok: false,
      error: "No se pudo preparar la sesión de proveedor. Intenta de nuevo.",
    };
  }

  return {
    ok: true,
    tokenHash,
    redirectTo: input.redirectTo,
    email: normalized,
  };
}

/**
 * @deprecated Prefer prepareSupplierSessionToken + verifyOtp en cliente.
 * Se mantiene por compatibilidad de imports.
 */
export async function establishSupplierSessionForEmail(
  email: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const prepared = await prepareSupplierSessionToken({
    email,
    redirectTo: "/proveedor/dashboard",
  });
  if (!prepared.ok) return prepared;

  // Fallback servidor (tests / rutas): intentar verifyOtp aquí.
  const { createClient } = await import("@/lib/supabase/server");
  const { ensureUserProfile } = await import("@/lib/auth/ensure-profile");
  const supabase = await createClient();

  // Limpiar sesión previa (cliente/tienda) para no chocar al abrir la de proveedor.
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  const otpTypes = ["magiclink", "email"] as const;
  let lastError: string | null = null;

  for (const type of otpTypes) {
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: prepared.tokenHash,
      type,
    });

    if (!otpError && otpData.session && otpData.user) {
      try {
        await ensureUserProfile(supabase);
      } catch {
        // El trigger suele crear el perfil; no bloquear el acceso mayorista.
      }
      return { ok: true, user: otpData.user };
    }

    lastError = otpError?.message ?? null;
  }

  return {
    ok: false,
    error: formatAuthError(
      lastError ?? "Error al procesar la sesión de proveedor. Intenta de nuevo.",
    ),
  };
}

/** Crea usuario Auth sin confirmar email; si existe, lo reutiliza sin auto-confirmar. */
export async function ensureAuthUserForSupplier(input: {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
  /** Si ya resolvimos el Auth user (p. ej. desde supplier_profiles). */
  existingUser?: User | null;
}): Promise<
  | { ok: true; userId: string; emailConfirmed: boolean }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  const admin = createAdminClient();

  if (input.existingUser?.id) {
    const existing = input.existingUser;
    const mergedMetadata = {
      ...(existing.user_metadata ?? {}),
      ...input.metadata,
    };
    const emailConfirmed = isAuthEmailVerified(existing);

    // No sobrescribir la contraseña Auth de una cuenta ya verificada (tienda/cliente).
    // La clave del panel proveedor vive en supplier_profiles.password_hash.
    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      emailConfirmed
        ? { user_metadata: mergedMetadata }
        : {
            password: input.password,
            user_metadata: mergedMetadata,
          },
    );

    if (updateError) {
      console.warn("[supplier-auth-metadata]", updateError.message);
    }

    return {
      ok: true,
      userId: existing.id,
      emailConfirmed,
    };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: false,
      user_metadata: input.metadata,
    });

  if (!createError && created.user?.id) {
    return {
      ok: true,
      userId: created.user.id,
      emailConfirmed: isAuthEmailVerified(created.user),
    };
  }

  if (createError && !isExistingUserError(createError.message)) {
    return { ok: false, error: formatAuthError(createError.message) };
  }

  const existing = await lookupAuthUserByEmail(email);
  if (!existing) {
    return {
      ok: false,
      error:
        "No se pudo vincular el correo a la cuenta de proveedor. Intenta de nuevo.",
    };
  }

  const mergedMetadata = {
    ...(existing.user_metadata ?? {}),
    ...input.metadata,
  };

  const emailConfirmed = isAuthEmailVerified(existing);

  // No sobrescribir la contraseña Auth de una cuenta ya verificada (tienda/cliente).
  // La clave del panel proveedor vive en supplier_profiles.password_hash.
  const { error: updateError } = await admin.auth.admin.updateUserById(
    existing.id,
    emailConfirmed
      ? { user_metadata: mergedMetadata }
      : {
          password: input.password,
          user_metadata: mergedMetadata,
        },
  );

  if (updateError) {
    console.warn("[supplier-auth-metadata]", updateError.message);
  }

  return {
    ok: true,
    userId: existing.id,
    emailConfirmed,
  };
}
