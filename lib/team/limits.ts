import type { PlanId } from "@/src/config/plans";
import {
  DEFAULT_PLAN_SETTINGS,
  planIdToSettingsKey,
  type PlanSettingsMap,
} from "@/lib/plans/plan-settings";
import type { TeamLimitSummary } from "@/lib/team/types";

/** Techo técnico de miembros + invitaciones pendientes por tienda. */
export const ABSOLUTE_MAX_TEAM_SLOTS = 50;

export function canUseTeamFeature(planId: PlanId): boolean {
  return planId === "premium" || planId === "enterprise";
}

export function getUserLimitFromSettings(
  planId: PlanId,
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): number | null {
  return settings[planIdToSettingsKey(planId)].userLimit;
}

export function resolveTeamLimit(options: {
  planId: PlanId;
  memberCount: number;
  pendingInviteCount: number;
  settings?: PlanSettingsMap;
}): TeamLimitSummary {
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS;
  const canManageTeam = canUseTeamFeature(options.planId);
  const usedSlots = options.memberCount + options.pendingInviteCount;

  if (!canManageTeam) {
    return {
      planId: options.planId,
      canManageTeam: false,
      maxAllowed: 1,
      isUnlimited: false,
      memberCount: options.memberCount,
      pendingInviteCount: options.pendingInviteCount,
      usedSlots,
      remainingSlots: 0,
      canInviteMore: false,
    };
  }

  const configuredLimit = getUserLimitFromSettings(options.planId, settings);
  const isUnlimited = configuredLimit == null;
  const maxAllowed = isUnlimited
    ? ABSOLUTE_MAX_TEAM_SLOTS
    : Math.min(ABSOLUTE_MAX_TEAM_SLOTS, configuredLimit);
  const remainingSlots = Math.max(0, maxAllowed - usedSlots);

  return {
    planId: options.planId,
    canManageTeam: true,
    maxAllowed: isUnlimited ? null : maxAllowed,
    isUnlimited,
    memberCount: options.memberCount,
    pendingInviteCount: options.pendingInviteCount,
    usedSlots,
    remainingSlots,
    canInviteMore: remainingSlots > 0,
  };
}

export function formatTeamLimitLabel(limit: TeamLimitSummary): string {
  if (!limit.canManageTeam) {
    return "Disponible en Plan Business o Enterprise";
  }
  if (limit.isUnlimited) {
    return "Usuarios de equipo ilimitados";
  }
  if (limit.maxAllowed == null) {
    return "Usuarios de equipo";
  }
  return `Hasta ${limit.maxAllowed} usuarios del equipo`;
}
