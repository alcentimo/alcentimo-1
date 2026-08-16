"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { SUPPLIER_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  isAuthEmailVerified,
} from "@/lib/auth/email-verified";
import {
  ensureAuthUserForSupplier,
  establishSupplierSessionForEmail,
  lookupAuthUserByEmail,
} from "@/lib/supplier/auth-session";
import { resolveSupplierAccess } from "@/lib/supplier/access";
import { verifySupplierPassword } from "@/lib/supplier/password";
import { createClient } from "@/lib/supabase/server";

export type SupplierLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
  const { data, error } = await (admin as any)
    .from("supplier_profiles")
    .select(
      "user_id, email, status, password_hash, contact_name, company_name",
    )
    .eq("email", email)
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
 * Login aislado del panel mayorista.
 * Valida email+contraseña contra supplier_profiles y abre sesión limpia
 * hacia /proveedor/dashboard (sin pasar por AuthPanel de clientes/tiendas).
 */
export async function loginSupplierAction(input: {
  email: string;
  password: string;
}): Promise<SupplierLoginResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  try {
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
      } else {
        // Perfil legacy (allowlist) sin hash: probar contraseña Auth una vez.
        const supabase = await createClient();
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (authError || !authData.user) {
          return {
            ok: false,
            error: formatAuthError(
              authError?.message ?? "Correo o contraseña incorrectos.",
            ),
          };
        }
        if (!isAuthEmailVerified(authData.user)) {
          await supabase.auth.signOut();
          return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
        }
        const access = await resolveSupplierAccess({
          email,
          userId: authData.user.id,
          user: authData.user,
        });
        if (!access.ok) {
          await supabase.auth.signOut();
          return {
            ok: false,
            error: "No tienes acceso al panel de proveedores.",
          };
        }
        return { ok: true, redirectTo: SUPPLIER_POST_AUTH_PATH };
      }

      const authUser = await lookupAuthUserByEmail(profile.email || email);
      if (authUser && !isAuthEmailVerified(authUser)) {
        return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
      }

      const ensured = await ensureAuthUserForSupplier({
        email: profile.email || email,
        password,
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

      const session = await establishSupplierSessionForEmail(
        profile.email || email,
      );
      if (!session.ok) return session;

      return { ok: true, redirectTo: SUPPLIER_POST_AUTH_PATH };
    }

    // Sin fila en supplier_profiles: allowlist / admin vía Auth.
    const supabase = await createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      return {
        ok: false,
        error: formatAuthError(
          authError?.message ?? "Correo o contraseña incorrectos.",
        ),
      };
    }

    if (!isAuthEmailVerified(authData.user)) {
      await supabase.auth.signOut();
      return { ok: false, error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
    }

    const access = await resolveSupplierAccess({
      email,
      userId: authData.user.id,
      user: authData.user,
    });

    if (!access.ok) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error:
          "No encontramos una cuenta de proveedor con estos datos. Regístrate como mayorista.",
      };
    }

    return { ok: true, redirectTo: SUPPLIER_POST_AUTH_PATH };
  } catch (caught) {
    console.error("[loginSupplierAction]", caught);
    return {
      ok: false,
      error:
        caught instanceof Error
          ? caught.message
          : "Error al procesar la sesión de proveedor. Intenta de nuevo.",
    };
  }
}
