import type { User } from "@supabase/supabase-js";

export type SupportAdminDenyReason =
  | "missing_email"
  | "empty_allowlist"
  | "not_listed";

export interface SupportAdminAccessCheck {
  ok: boolean;
  reason?: SupportAdminDenyReason;
  normalizedEmail: string | null;
  allowlistConfigured: boolean;
  allowlistCount: number;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']+|["']+$/g, "").trim();
}

/** Parsea SUPPORT_ADMIN_EMAILS (coma o punto y coma, sin sensibilidad a mayúsculas). */
export function parseSupportAdminEmails(
  raw: string | undefined | null,
): string[] {
  if (!raw?.trim()) return [];

  return raw
    .split(/[,;]+/)
    .map((entry) => stripQuotes(entry).toLowerCase())
    .filter(Boolean);
}

export function getSupportAdminAllowlist(): string[] {
  return parseSupportAdminEmails(process.env.SUPPORT_ADMIN_EMAILS);
}

export function normalizeSupportEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveAuthEmail(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
): string | null {
  if (!user) return null;

  const direct = normalizeSupportEmail(user.email);
  if (direct) return direct;

  const metadata = user.user_metadata;
  if (metadata && typeof metadata.email === "string") {
    return normalizeSupportEmail(metadata.email);
  }

  return null;
}

export function checkSupportAdminAccess(
  email: string | null | undefined,
): SupportAdminAccessCheck {
  const normalizedEmail = normalizeSupportEmail(email);
  const allowlist = getSupportAdminAllowlist();
  const allowlistConfigured = allowlist.length > 0;

  if (!normalizedEmail) {
    return {
      ok: false,
      reason: "missing_email",
      normalizedEmail: null,
      allowlistConfigured,
      allowlistCount: allowlist.length,
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

  if (!allowlist.includes(normalizedEmail)) {
    return {
      ok: false,
      reason: "not_listed",
      normalizedEmail,
      allowlistConfigured: true,
      allowlistCount: allowlist.length,
    };
  }

  return {
    ok: true,
    normalizedEmail,
    allowlistConfigured: true,
    allowlistCount: allowlist.length,
  };
}

export function isSupportAdmin(email: string | null | undefined): boolean {
  return checkSupportAdminAccess(email).ok;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

/** Información de depuración segura (sin exponer la allowlist completa). */
export function getSupportAdminDebugInfo(email: string | null | undefined) {
  const check = checkSupportAdminAccess(email);
  const allowlist = getSupportAdminAllowlist();

  return {
    ...check,
    sessionEmail: email ?? null,
    allowlistPreview: allowlist.map(maskEmail),
    envVarPresent: Boolean(process.env.SUPPORT_ADMIN_EMAILS?.trim()),
    envVarLength: process.env.SUPPORT_ADMIN_EMAILS?.trim().length ?? 0,
  };
}
