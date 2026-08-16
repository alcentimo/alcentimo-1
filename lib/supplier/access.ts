import type { User } from "@supabase/supabase-js";
import {
  checkSupportAdminAccess,
  normalizeSupportEmail,
  parseSupportAdminEmails,
  resolveAuthEmail,
} from "@/lib/support/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export type SupplierDenyReason =
  | "missing_email"
  | "empty_allowlist"
  | "not_listed"
  | "no_profile";

export interface SupplierAccessCheck {
  ok: boolean;
  reason?: SupplierDenyReason;
  normalizedEmail: string | null;
  allowlistConfigured: boolean;
  allowlistCount: number;
  via?: "allowlist" | "admin" | "profile";
}

/** Parsea SUPPLIER_EMAILS (coma o punto y coma). */
export function getSupplierAllowlist(): string[] {
  return parseSupportAdminEmails(process.env.SUPPLIER_EMAILS);
}

/** Rol de mayorista declarado en user_metadata (registro self-serve). */
export function isSupplierRoleMetadata(
  user?: Pick<User, "user_metadata"> | null,
): boolean {
  const metadata = user?.user_metadata ?? {};
  const role =
    typeof metadata.role === "string" ? metadata.role.trim().toLowerCase() : "";
  const registrationType =
    typeof metadata.registration_type === "string"
      ? metadata.registration_type.trim().toLowerCase()
      : "";
  return (
    role === "supplier" ||
    role === "mayorista" ||
    role === "proveedor" ||
    registrationType === "supplier" ||
    registrationType === "proveedor"
  );
}

/**
 * Acceso por allowlist de email (SUPPLIER_EMAILS) o support-admin.
 * No contempla perfiles self-serve; usa `resolveSupplierAccess` para eso.
 */
export function checkSupplierAccess(
  email: string | null | undefined,
): SupplierAccessCheck {
  const normalizedEmail = normalizeSupportEmail(email);
  const supplierList = getSupplierAllowlist();
  const allowlistConfigured =
    supplierList.length > 0 ||
    Boolean(process.env.SUPPORT_ADMIN_EMAILS?.trim());
  const allowlistCount = supplierList.length;
  const isAdmin = checkSupportAdminAccess(email).ok;

  if (!normalizedEmail) {
    return {
      ok: false,
      reason: "missing_email",
      normalizedEmail: null,
      allowlistConfigured,
      allowlistCount,
    };
  }

  if (isAdmin) {
    return {
      ok: true,
      normalizedEmail,
      allowlistConfigured: true,
      allowlistCount,
      via: "admin",
    };
  }

  if (supplierList.includes(normalizedEmail)) {
    return {
      ok: true,
      normalizedEmail,
      allowlistConfigured: true,
      allowlistCount,
      via: "allowlist",
    };
  }

  if (!allowlistConfigured) {
    return {
      ok: false,
      reason: "empty_allowlist",
      normalizedEmail,
      allowlistConfigured: false,
      allowlistCount: 0,
    };
  }

  return {
    ok: false,
    reason: "not_listed",
    normalizedEmail,
    allowlistConfigured: true,
    allowlistCount,
  };
}

/** ¿Tiene fila activa en supplier_profiles? (siempre vía admin, sin depender de RLS). */
export async function userHasActiveSupplierProfile(
  userId: string,
): Promise<boolean> {
  if (!userId.trim()) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const { data, error } = await db
      .from("supplier_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.warn("[supplier-profile-lookup]", error.message);
      return false;
    }

    return Boolean(data?.user_id);
  } catch (caught) {
    console.warn(
      "[supplier-profile-lookup]",
      caught instanceof Error ? caught.message : caught,
    );
    return false;
  }
}

/** Perfil activo por correo (case-insensitive), independiente del user_id Auth. */
export async function emailHasActiveSupplierProfile(
  email: string | null | undefined,
): Promise<boolean> {
  const normalizedEmail = normalizeSupportEmail(email);
  if (!normalizedEmail) return false;

  const escaped = normalizedEmail
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const { data, error } = await db
      .from("supplier_profiles")
      .select("user_id")
      .ilike("email", escaped)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[supplier-profile-email-lookup]", error.message);
      return false;
    }

    return Boolean(data?.user_id);
  } catch (caught) {
    console.warn(
      "[supplier-profile-email-lookup]",
      caught instanceof Error ? caught.message : caught,
    );
    return false;
  }
}

/**
 * Acceso completo al hub /proveedor: allowlist, admin o perfil activo.
 * No usa solo metadata (evita falsos positivos en login de clientes/tiendas).
 * El perfil se acepta por user_id o por email (roles cruzados tienda/proveedor).
 */
export async function resolveSupplierAccess(input: {
  email?: string | null;
  userId?: string | null;
  user?: Pick<User, "user_metadata"> | null;
}): Promise<SupplierAccessCheck> {
  const emailCheck = checkSupplierAccess(input.email);
  if (emailCheck.ok) return emailCheck;

  if (input.userId) {
    const hasProfile = await userHasActiveSupplierProfile(input.userId);
    if (hasProfile) {
      return {
        ok: true,
        normalizedEmail: emailCheck.normalizedEmail,
        allowlistConfigured: emailCheck.allowlistConfigured,
        allowlistCount: emailCheck.allowlistCount,
        via: "profile",
      };
    }
  }

  // Misma persona con cuenta de tienda/cliente: el perfil puede vivir por email
  // aunque el user_id Auth se haya realineado.
  if (emailCheck.normalizedEmail) {
    const hasEmailProfile = await emailHasActiveSupplierProfile(
      emailCheck.normalizedEmail,
    );
    if (hasEmailProfile) {
      return {
        ok: true,
        normalizedEmail: emailCheck.normalizedEmail,
        allowlistConfigured: emailCheck.allowlistConfigured,
        allowlistCount: emailCheck.allowlistCount,
        via: "profile",
      };
    }
  }

  if (emailCheck.reason === "empty_allowlist" && input.userId) {
    return {
      ...emailCheck,
      reason: "no_profile",
    };
  }

  return emailCheck;
}

/**
 * ¿Debe el post-login forzar /proveedor/dashboard?
 * Solo allowlist o perfil activo — nunca admin genérico ni metadata suelta,
 * para no mezclar login de clientes/tiendas con el hub mayorista.
 */
export async function shouldForceSupplierPostAuthRedirect(input: {
  email?: string | null;
  userId?: string | null;
}): Promise<boolean> {
  const normalizedEmail = normalizeSupportEmail(input.email);
  const supplierList = getSupplierAllowlist();

  if (normalizedEmail && supplierList.includes(normalizedEmail)) {
    return true;
  }

  if (input.userId && (await userHasActiveSupplierProfile(input.userId))) {
    return true;
  }

  if (normalizedEmail) {
    return emailHasActiveSupplierProfile(normalizedEmail);
  }

  return false;
}

export function isSupplierUser(email: string | null | undefined): boolean {
  return checkSupplierAccess(email).ok;
}

export function resolveSupplierAuthEmail(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
): string | null {
  return resolveAuthEmail(user);
}
