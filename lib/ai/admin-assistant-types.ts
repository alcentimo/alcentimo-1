export type AdminAssistantMessageRole = "user" | "assistant";

export interface AdminAssistantMessage {
  role: AdminAssistantMessageRole;
  content: string;
}

export interface AdminAssistantRequest {
  messages: AdminAssistantMessage[];
}

export interface AdminAssistantContext {
  generatedAt: string;
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
  storesSample: Array<{
    name: string;
    slug: string;
    isActive: boolean;
    rubro: string | null;
    ownerEmail: string | null;
    ownerPlan: string | null;
    ownerSubscriptionStatus: string | null;
  }>;
  usersNearProductLimit: Array<{
    email: string | null;
    plan: string;
    productCount: number;
    storeCount: number;
    periodEndsAt: string | null;
  }>;
  targetedLookups: Array<{
    query: string;
    matches: Array<Record<string, string | number | boolean | null>>;
  }>;
  notes: string[];
}
