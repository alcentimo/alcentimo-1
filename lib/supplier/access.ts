import type { User } from "@supabase/supabase-js";
import {
  checkSupportAdminAccess,
  normalizeSupportEmail,
  parseSupportAdminEmails,
  resolveAuthEmail,
} from "@/lib/support/admin-access";

export type SupplierDenyReason =
  | "missing_email"
  | "empty_allowlist"
  | "not_listed";

export interface SupplierAccessCheck {
  ok: boolean;
  reason?: SupplierDenyReason;
  normalizedEmail: string | null;
  allowlistConfigured: boolean;
  allowlistCount: number;
}

/** Parsea SUPPLIER_EMAILS (coma o punto y coma). */
export function getSupplierAllowlist(): string[] {
  return parseSupportAdminEmails(process.env.SUPPLIER_EMAILS);
}

/**
 * Acceso al hub oculto `/proveedor`.
 * Incluye SUPPLIER_EMAILS y, por comodidad de prueba, SUPPORT_ADMIN_EMAILS.
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

  if (!allowlistConfigured) {
    return {
      ok: false,
      reason: "empty_allowlist",
      normalizedEmail,
      allowlistConfigured: false,
      allowlistCount: 0,
    };
  }

  if (!supplierList.includes(normalizedEmail) && !isAdmin) {
    return {
      ok: false,
      reason: "not_listed",
      normalizedEmail,
      allowlistConfigured: true,
      allowlistCount,
    };
  }

  return {
    ok: true,
    normalizedEmail,
    allowlistConfigured: true,
    allowlistCount,
  };
}

export function isSupplierUser(email: string | null | undefined): boolean {
  return checkSupplierAccess(email).ok;
}

export function resolveSupplierAuthEmail(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
): string | null {
  return resolveAuthEmail(user);
}
