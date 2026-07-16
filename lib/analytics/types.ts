export interface AnalyticsKpis {
  totalSalesUsd: number;
  ordersReceived: number;
  averageTicketUsd: number;
  activeInventoryCount: number;
  lowStockCount: number;
}

export interface DailySalesVolume {
  date: string;
  label: string;
  amountUsd: number;
}

export interface TopProductInsight {
  productId: string;
  name: string;
  unitsSold: number;
  thumbUrl: string | null;
}

export interface LowStockProductInsight {
  productId: string;
  name: string;
  availableStock: number;
  thumbUrl: string | null;
}

export interface StoreAnalytics {
  kpis: AnalyticsKpis;
  weeklySales: DailySalesVolume[];
  topProducts: TopProductInsight[];
  lowStockProducts: LowStockProductInsight[];
}
