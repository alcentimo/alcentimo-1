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

export interface OwnerAssistantOrderSummary {
  id: string;
  customerName: string;
  totalUsd: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

export interface OwnerAssistantSaleSummary {
  productName: string;
  amountUsd: number;
  quantity: number;
  createdAt: string;
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
  };
  sales: {
    todayUsd: number;
    monthToDateUsd: number;
    pendingOrders: number;
    recentOrders: OwnerAssistantOrderSummary[];
    recentManualSales: OwnerAssistantSaleSummary[];
    topProducts: Array<{ name: string; unitsSold: number }>;
  };
}
