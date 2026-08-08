import { normalizeSupportEmail } from "@/lib/support/admin-access";

/**
 * Correos con permiso para ver la opción «Equipo» en el menú lateral.
 * Independiente de SUPPORT_ADMIN_EMAILS (panel /admin).
 */
export const TEAM_NAV_ALLOWED_EMAILS = [
  "jose95jimenez95@gmail.com",
] as const;

export function canSeeTeamNav(email: string | null | undefined): boolean {
  const normalized = normalizeSupportEmail(email);
  if (!normalized) return false;
  return TEAM_NAV_ALLOWED_EMAILS.some((allowed) => allowed === normalized);
}
