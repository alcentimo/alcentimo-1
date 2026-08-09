import type { StoreMemberRole } from "@/lib/database.types";

/** Rol efectivo del usuario dentro de la tienda activa del panel. */
export type DashboardStoreRole = StoreMemberRole;

export const DASHBOARD_STORE_ROLES: DashboardStoreRole[] = [
  "owner",
  "admin",
  "staff",
];

const ROLE_RANK: Record<DashboardStoreRole, number> = {
  owner: 3,
  admin: 2,
  staff: 1,
};

export function hasMinimumStoreRole(
  role: DashboardStoreRole | null | undefined,
  minimum: DashboardStoreRole,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isDashboardStoreOwner(
  role: DashboardStoreRole | null | undefined,
): boolean {
  return role === "owner";
}

export function canManageStoreTeam(
  role: DashboardStoreRole | null | undefined,
): boolean {
  return role === "owner";
}

export function canManageStoreSettings(
  role: DashboardStoreRole | null | undefined,
): boolean {
  return role === "owner";
}

/** Prefijos de ruta ordenados de más específico a más general. */
const DASHBOARD_ROUTE_ACCESS: Array<{
  prefix: string;
  roles: DashboardStoreRole[];
}> = [
  { prefix: "/dashboard/ajustes", roles: ["owner"] },
  { prefix: "/dashboard/promociones", roles: ["owner"] },
  { prefix: "/dashboard/planes", roles: ["owner"] },
  { prefix: "/dashboard/upgrade", roles: ["owner"] },
  { prefix: "/dashboard/referidos", roles: ["owner"] },
  { prefix: "/dashboard/pago", roles: ["owner"] },
  { prefix: "/activar", roles: ["owner"] },
  { prefix: "/dashboard/equipo", roles: ["owner"] },
  { prefix: "/dashboard/cuenta", roles: ["owner", "admin", "staff"] },
  { prefix: "/dashboard/analiticas", roles: ["owner"] },
  { prefix: "/dashboard/asistente", roles: ["owner"] },
  { prefix: "/dashboard/tasas", roles: ["owner"] },
  { prefix: "/dashboard/mensajes", roles: ["owner"] },
  { prefix: "/dashboard/soporte", roles: ["owner"] },
  { prefix: "/dashboard/clientes", roles: ["owner", "admin"] },
  { prefix: "/dashboard/inventario", roles: ["owner", "admin"] },
  { prefix: "/dashboard/productos", roles: ["owner", "admin"] },
  { prefix: "/dashboard/ventas", roles: ["owner", "admin", "staff"] },
  { prefix: "/dashboard/pedidos", roles: ["owner", "admin", "staff"] },
  { prefix: "/dashboard/catalogo", roles: ["owner", "admin", "staff"] },
  { prefix: "/dashboard", roles: ["owner", "admin"] },
];

const DEFAULT_MERCHANT_ROLES: DashboardStoreRole[] = [
  "owner",
  "admin",
  "staff",
];

export function resolveRequiredRolesForPath(pathname: string): DashboardStoreRole[] {
  const normalized = pathname.split("?")[0]?.split("#")[0] ?? pathname;

  for (const rule of DASHBOARD_ROUTE_ACCESS) {
    if (
      normalized === rule.prefix ||
      normalized.startsWith(`${rule.prefix}/`)
    ) {
      return rule.roles;
    }
  }

  if (normalized.startsWith("/dashboard")) {
    return DEFAULT_MERCHANT_ROLES;
  }

  return DEFAULT_MERCHANT_ROLES;
}

export function canAccessDashboardPath(
  role: DashboardStoreRole | null | undefined,
  pathname: string,
): boolean {
  if (!role) return false;
  const allowedRoles = resolveRequiredRolesForPath(pathname);
  return allowedRoles.includes(role);
}

export function getDefaultDashboardPathForRole(
  role: DashboardStoreRole | null | undefined,
): string {
  if (role === "staff") return "/dashboard/pedidos";
  if (role === "admin") return "/dashboard/catalogo";
  return "/dashboard/catalogo";
}

export const DASHBOARD_INVITATION_PATH = "/dashboard/invitacion";

export function isDashboardInvitationPath(pathname: string): boolean {
  return pathname === DASHBOARD_INVITATION_PATH ||
    pathname.startsWith(`${DASHBOARD_INVITATION_PATH}/`);
}

export const DASHBOARD_AUTH_PUBLIC_PATHS = new Set([
  "/dashboard/login",
  "/dashboard/recuperar-contrasena",
  "/dashboard/restablecer-contrasena",
  "/dashboard/restablecer-contrasena/exito",
  "/dashboard/verificar-cuenta",
]);

export function isDashboardPublicAuthPath(pathname: string): boolean {
  return DASHBOARD_AUTH_PUBLIC_PATHS.has(pathname);
}
