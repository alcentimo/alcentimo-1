import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  isAuthEmailVerified,
} from "@/lib/auth/email-verified";
import { verifySupplierPassword } from "@/lib/supplier/password";
import {
  ensureAuthUserForSupplier,
  prepareSupplierSessionToken,
  resolveAuthUserForSupplierProfile,
} from "@/lib/supplier/auth-session";
import { resolveSupplierAccess } from "@/lib/supplier/access";
import { SUPPLIER_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function escapeIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type SupplierCredentialCheck =
  | {
      ok: true;
      mode: "supplier_token";
      email: string;
      redirectTo: string;
      sessionTokenHash: string;
    }
  | {
      ok: true;
      mode: "auth_password";
      email: string;
      redirectTo: string;
    }
  | { ok: false; error: string };

type SupplierCredentialRow = {
  user_id: string;
  email: string;
  status: string;
  password_hash: string | null;
  contact_name: string | null;
  company_name: string | null;
};

async function findSupplierCredentialsByEmail(
  email: string,
): Promise<SupplierCredentialRow | null> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data, error } = await db
    .from("supplier_profiles")
    .select(
      "user_id, email, status, password_hash, contact_name, company_name",
    )
    .ilike("email", escapeIlikeExact(email))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supplier-login-lookup]", error.message);
    return null;
  }

  if (!data?.user_id) return null;

  return {
    user_id: String(data.user_id),
    email: normalizeEmail(String(data.email ?? email)),
    status: typeof data.status === "string" ? data.status : "active",
    password_hash:
      typeof data.password_hash === "string" ? data.password_hash : null,
    contact_name:
      typeof data.contact_name === "string" ? data.contact_name : null,
    company_name:
      typeof data.company_name === "string" ? data.company_name : null,
  };
}

/**
 * Valida credenciales de proveedor sin abrir sesión ni tocar cookies.
 * El cliente (o un route handler) establece la sesión Auth después.
 */
export async function validateSupplierLoginCredentials(input: {
  email: string;
  password: string;
}): Promise<SupplierCredentialCheck> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  const profile = await findSupplierCredentialsByEmail(email);

  if (profile) {
    if (profile.status !== "active") {
      return {
        ok: false,
        error: "Tu cuenta de proveedor no está activa. Contacta soporte.",
      };
    }

    if (profile.password_hash) {
      if (!verifySupplierPassword(password, profile.password_hash)) {
        return { ok: false, error: "Correo o contraseña incorrectos." };
      }

      const resolved = await resolveAuthUserForSupplierProfile({
        profileUserId: profile.user_id,
        email: profile.email || email,
      });
      if (!resolved.ok) return resolved;

      if (!isAuthEmailVerified(resolved.user)) {
        return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
      }

      const ensured = await ensureAuthUserForSupplier({
        email: profile.email || email,
        password,
        existingUser: resolved.user,
        metadata: {
          display_name: profile.contact_name ?? undefined,
          company_name: profile.company_name ?? undefined,
          role: "supplier",
          registration_type: "supplier",
        },
      });
      if (!ensured.ok) return ensured;
      if (!ensured.emailConfirmed) {
        return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
      }

      const access = await resolveSupplierAccess({
        email: profile.email || email,
        userId: ensured.userId,
        user: resolved.user,
      });
      if (!access.ok) {
        return {
          ok: false,
          error: "No tienes acceso al panel de proveedores.",
        };
      }

      const session = await prepareSupplierSessionToken({
        email: profile.email || email,
        redirectTo: SUPPLIER_POST_AUTH_PATH,
      });
      if (!session.ok) return session;

      return {
        ok: true,
        mode: "supplier_token",
        email: session.email,
        redirectTo: session.redirectTo,
        sessionTokenHash: session.tokenHash,
      };
    }

    // Perfil legacy sin hash: el cliente debe usar la contraseña Auth.
    const access = await resolveSupplierAccess({
      email: profile.email || email,
      userId: profile.user_id,
    });
    if (!access.ok) {
      return {
        ok: false,
        error: "No tienes acceso al panel de proveedores.",
      };
    }

    return {
      ok: true,
      mode: "auth_password",
      email: profile.email || email,
      redirectTo: SUPPLIER_POST_AUTH_PATH,
    };
  }

  // Sin fila en supplier_profiles: allowlist / admin con contraseña Auth.
  const access = await resolveSupplierAccess({ email });
  if (!access.ok) {
    return {
      ok: false,
      error:
        "No encontramos una cuenta de proveedor con estos datos. Regístrate como mayorista.",
    };
  }

  return {
    ok: true,
    mode: "auth_password",
    email,
    redirectTo: SUPPLIER_POST_AUTH_PATH,
  };
}

/** Mensaje de error seguro para fallos inesperados de login proveedor. */
export function supplierLoginUnexpectedError(caught: unknown): string {
  console.error("[supplier-login]", caught);
  if (caught instanceof Error && caught.message.trim()) {
    return formatAuthError(caught.message);
  }
  return "No se pudo iniciar sesión como proveedor. Intenta de nuevo.";
}
