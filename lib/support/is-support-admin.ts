/** Emails con acceso a /dashboard/soporte (lista separada por comas). */
export function isSupportAdmin(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;

  const allowlist = process.env.SUPPORT_ADMIN_EMAILS?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!allowlist?.length) return false;
  return allowlist.includes(normalized);
}
