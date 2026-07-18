export interface SalesComparison {
  todayUsd: number;
  monthToDateUsd: number;
  todayLabel: string;
  monthLabel: string;
}

export interface RegistrationMetrics {
  periodDays: number;
  uniqueVisitors: number;
  registrations: number;
  registrationRatePct: number;
  newCustomerProfiles: number;
  trackingEnabled: boolean;
}

export interface TopProductInsight {
  productId: string;
  name: string;
  unitsSold: number;
  thumbUrl: string | null;
}

export interface StoreAnalyticsPanel {
  salesComparison: SalesComparison;
  topProducts: TopProductInsight[];
  registrationMetrics: RegistrationMetrics;
}

/** @deprecated Usar StoreAnalyticsPanel para la vista simplificada. */
export interface AnalyticsKpis {
  totalSalesUsd: number;
  ordersReceived: number;
  averageTicketUsd: number;
  activeInventoryCount: number;
  lowStockCount: number;
}

/** @deprecated */
export interface DailySalesVolume {
  date: string;
  label: string;
  amountUsd: number;
}

/** @deprecated */
export interface LowStockProductInsight {
  productId: string;
  name: string;
  availableStock: number;
  thumbUrl: string | null;
}

/** @deprecated */
export interface StoreAnalytics {
  kpis: AnalyticsKpis;
  weeklySales: DailySalesVolume[];
  topProducts: TopProductInsight[];
  lowStockProducts: LowStockProductInsight[];
}
