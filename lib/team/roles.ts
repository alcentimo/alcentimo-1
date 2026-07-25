import type { StoreMemberRole } from "@/lib/database.types";
import type { InvitableTeamRole } from "@/lib/team/types";

export const TEAM_ROLE_LABELS: Record<StoreMemberRole, string> = {
  owner: "Dueño",
  admin: "Encargado",
  staff: "Vendedor",
};

export const INVITABLE_TEAM_ROLES: InvitableTeamRole[] = ["admin", "staff"];

export const INVITABLE_ROLE_LABELS: Record<InvitableTeamRole, string> = {
  admin: TEAM_ROLE_LABELS.admin,
  staff: TEAM_ROLE_LABELS.staff,
};

export const INVITABLE_ROLE_DESCRIPTIONS: Record<InvitableTeamRole, string> = {
  admin: "Gestiona inventario, pedidos y clientes. Sin acceso a facturación ni ajustes de tienda.",
  staff: "Crea órdenes y consulta el catálogo. Acceso operativo limitado.",
};

export const ROLE_PERMISSIONS_SUMMARY: Record<
  StoreMemberRole,
  { title: string; items: string[] }
> = {
  owner: {
    title: "Dueño",
    items: [
      "Acceso total al panel, configuración y facturación.",
      "Gestiona el equipo, roles e invitaciones.",
      "Catálogo, inventario, pedidos, clientes y analíticas.",
    ],
  },
  admin: {
    title: "Encargado",
    items: [
      "Gestiona inventario, productos, pedidos y clientes.",
      "Sin acceso a ajustes de tienda, planes ni facturación.",
      "No puede invitar ni eliminar miembros del equipo.",
    ],
  },
  staff: {
    title: "Vendedor",
    items: [
      "Consulta el catálogo y crea órdenes de venta.",
      "Sin acceso a inventario, clientes, ajustes ni analíticas.",
    ],
  },
};

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isInvitableTeamRole(value: string): value is InvitableTeamRole {
  return value === "admin" || value === "staff";
}
