export type OwnerAssistantRole = "user" | "assistant";

export interface OwnerAssistantMessage {
  role: OwnerAssistantRole;
  content: string;
}

export interface OwnerAssistantRequest {
  messages: OwnerAssistantMessage[];
}

export interface OwnerAssistantResponse {
  reply: string;
}

export interface OwnerAssistantInventoryItem {
  name: string;
  category: string;
  availableStock: number;
  threshold: number;
  priceUsd: number | null;
}

export interface OwnerAssistantSlowMovingItem extends OwnerAssistantInventoryItem {
  unitsSoldThisMonth: number;
}

export interface OwnerAssistantOrderSummary {
  id: string;
  customerName: string;
  customerPhone: string | null;
  totalUsd: number;
  status: string;
  createdAt: string;
  itemCount: number;
  hasPaymentProof: boolean;
}

export interface OwnerAssistantSaleSummary {
  productName: string;
  amountUsd: number;
  quantity: number;
  createdAt: string;
}

export interface OwnerAssistantCustomerSummary {
  name: string | null;
  phone: string | null;
  orderCount: number;
  totalSpentUsd: number;
  lastOrderAt: string | null;
}

export interface OwnerAssistantPendingAccount {
  customerName: string;
  customerPhone: string | null;
  pendingOrders: number;
  pendingTotalUsd: number;
  oldestPendingAt: string;
  statuses: string[];
}

export interface OwnerAssistantContext {
  storeName: string;
  storeRubro: string | null;
  generatedAt: string;
  exchangeRate: {
    rate: number | null;
    source: string | null;
    effectiveDate: string | null;
  };
  inventory: {
    totalProducts: number;
    outOfStockCount: number;
    lowStockCount: number;
    criticalStockCount: number;
    outOfStock: OwnerAssistantInventoryItem[];
    lowStock: OwnerAssistantInventoryItem[];
    slowMoving: OwnerAssistantSlowMovingItem[];
    excessStock: OwnerAssistantSlowMovingItem[];
  };
  sales: {
    todayUsd: number;
    monthToDateUsd: number;
    pendingOrders: number;
    recentOrders: OwnerAssistantOrderSummary[];
    recentManualSales: OwnerAssistantSaleSummary[];
    topProducts: Array<{ name: string; unitsSold: number }>;
  };
  customers: {
    registeredCount: number;
    topCustomers: OwnerAssistantCustomerSummary[];
    pendingAccounts: OwnerAssistantPendingAccount[];
    ordersAwaitingPayment: OwnerAssistantOrderSummary[];
  };
  marketing: {
    slowMovingCount: number;
    excessStockCount: number;
    comboOpportunityCategories: string[];
  };
}
