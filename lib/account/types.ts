import type { DashboardStoreRole } from "@/lib/team/permissions";

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
}

export type AccountSettingsTab = "perfil" | "seguridad";
