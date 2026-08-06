import type { DashboardStoreRole } from "@/lib/team/permissions";

export interface AccountTrialSummary {
  /** Periodo formal de prueba gratuita (antes de endsAt). */
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  daysRemaining: number | null;
}

export interface AccountSnapshot {
  userId: string;
  email: string | null;
  displayName: string | null;
  planName: string;
  planId: string;
  memberSince: string | null;
  hasPasswordLogin: boolean;
  isStoreOwner: boolean;
  storeRole: DashboardStoreRole | null;
  storeName: string | null;
  trial: AccountTrialSummary | null;
}

export type AccountSettingsTab = "perfil" | "seguridad" | "planes";
