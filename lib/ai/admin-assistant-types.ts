export type AdminAssistantMessageRole = "user" | "assistant";

export interface AdminAssistantMessage {
  role: AdminAssistantMessageRole;
  content: string;
}

export interface AdminAssistantRequest {
  messages: AdminAssistantMessage[];
}

export interface AdminAssistantStoreRow {
  name: string;
  slug: string;
  isActive: boolean;
  rubro: string | null;
  ownerEmail: string | null;
  ownerPlan: string | null;
  ownerSubscriptionStatus: string | null;
  productCount: number;
  /** `public.stores.created_at` */
  storeCreatedAt: string | null;
  /** `auth.users.created_at` del dueño (fecha de registro de la cuenta). */
  accountRegisteredAt: string | null;
}

export interface AdminAssistantPaymentRow {
  id: string;
  userEmail: string | null;
  planId: string;
  status: string;
  amountDueUsd: number | null;
  referenceNumber: string | null;
  storeNames: string[];
  createdAt: string;
}

export interface AdminAssistantSupportRow {
  id: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface AdminAssistantCouponRow {
  code: string;
  name: string;
  rewardType: string;
  discountPercent: number | null;
  discountUsd: number | null;
  grantProDays: number | null;
  redemptionCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AdminAssistantCampaignRow {
  name: string;
  discountPercent: number | null;
  discountUsd: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  appliesToPlans: string[];
}

export interface AdminAssistantContext {
  generatedAt: string;
  /** Zona horaria y fecha local para consultas “hoy / ayer”. */
  calendar: {
    timezone: string;
    todayLocalDate: string;
    yesterdayLocalDate: string;
  };
  metrics: {
    totalUsers: number;
    totalStores: number;
    byPlan: Record<string, number>;
    storesByPlan: Record<string, number>;
    verifiedPaymentsUsd: number;
    pendingPayments: number;
  };
  plans: Array<{
    planKey: string;
    displayName: string;
    monthlyUsd: number;
    annualUsd: number | null;
    productLimit: number | null;
    userLimit: number | null;
    includedLocations: number;
    extraLocationMonthlyUsd: number;
  }>;
  paymentStatusCounts: Record<string, number>;
  pendingPaymentsSample: AdminAssistantPaymentRow[];
  verifiedPaymentsSample: AdminAssistantPaymentRow[];
  storesSample: AdminAssistantStoreRow[];
  /**
   * Altas recientes (últimos ~14 días) con fechas de tienda y cuenta,
   * para consultas temporales (“registradas hoy”, “esta semana”, etc.).
   */
  recentRegistrations: AdminAssistantStoreRow[];
  usersNearProductLimit: Array<{
    email: string | null;
    plan: string;
    productCount: number;
    storeCount: number;
    periodEndsAt: string | null;
    accountRegisteredAt: string | null;
  }>;
  supportStatusCounts: Record<string, number>;
  pendingSupportMessages: AdminAssistantSupportRow[];
  recentSupportMessages: AdminAssistantSupportRow[];
  activeCoupons: AdminAssistantCouponRow[];
  activeCampaigns: AdminAssistantCampaignRow[];
  targetedLookups: Array<{
    query: string;
    matches: Array<Record<string, string | number | boolean | null>>;
  }>;
  notes: string[];
}
