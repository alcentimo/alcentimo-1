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
  /** `public.stores.created_at` */
  storeCreatedAt: string | null;
  /** `auth.users.created_at` del dueño (fecha de registro de la cuenta). */
  accountRegisteredAt: string | null;
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
  }>;
  paymentStatusCounts: Record<string, number>;
  pendingPaymentsSample: Array<{
    id: string;
    userEmail: string | null;
    planId: string;
    status: string;
    amountDueUsd: number | null;
    storeNames: string[];
    createdAt: string;
  }>;
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
  targetedLookups: Array<{
    query: string;
    matches: Array<Record<string, string | number | boolean | null>>;
  }>;
  notes: string[];
}
