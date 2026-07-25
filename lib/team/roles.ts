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
  admin: "Gestiona inventario, pedidos y configuración operativa.",
  staff: "Atiende ventas y pedidos con acceso al panel.",
};

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isInvitableTeamRole(value: string): value is InvitableTeamRole {
  return value === "admin" || value === "staff";
}
