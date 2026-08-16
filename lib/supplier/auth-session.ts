import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
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

/** Localiza usuario Auth por email sin depender del listado paginado. */
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
 * Abre sesión Supabase para el email Auth sin exigir la contraseña de auth.users.
 * Requiere correo confirmado.
 */
export async function establishSupplierSessionForEmail(
  email: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
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

  const supabase = await createClient();
  const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (otpError || !otpData.session || !otpData.user) {
    return {
      ok: false,
      error: formatAuthError(
        otpError?.message ??
          "Error al procesar la sesión de proveedor. Intenta de nuevo.",
      ),
    };
  }

  try {
    await ensureUserProfile(supabase);
  } catch {
    // El trigger suele crear el perfil; no bloquear el acceso mayorista.
  }

  return { ok: true, user: otpData.user };
}

/** Crea usuario Auth sin confirmar email; si existe, lo reutiliza sin auto-confirmar. */
export async function ensureAuthUserForSupplier(input: {
  email: string;
  password: string;
  metadata: Record<string, unknown>;
}): Promise<
  | { ok: true; userId: string; emailConfirmed: boolean }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  const admin = createAdminClient();

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
