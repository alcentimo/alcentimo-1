export type AnalyticsRangePreset = "today" | "7d" | "month" | "prev_month" | "custom";

export interface AnalyticsDateRange {
  preset: AnalyticsRangePreset;
  from: string;
  to: string;
  label: string;
  previousFrom: string;
  previousTo: string;
  previousLabel: string;
}

export interface MetricComparison {
  value: number;
  previousValue: number;
  changePct: number | null;
}

export interface FinancialKpis {
  periodSalesUsd: MetricComparison;
  averageOrderValueUsd: MetricComparison;
  transactionCount: MetricComparison;
  todaySalesUsd: number;
  monthToDateUsd: number;
}

export interface TrafficMetrics {
  uniqueVisitors: MetricComparison;
  conversionRatePct: MetricComparison;
  conversionActions: number;
  registrationRatePct: MetricComparison;
  registrations: number;
  newCustomerProfiles: number;
  trackingEnabled: boolean;
}

export interface ProductInsight {
  productId: string;
  name: string;
  unitsSold: number;
  revenueUsd: number;
  thumbUrl: string | null;
}

export interface StagnantProductInsight {
  productId: string;
  name: string;
  thumbUrl: string | null;
  availableStock: number;
}

export interface DailySalesPoint {
  date: string;
  label: string;
  amountUsd: number;
}

export interface StoreAnalyticsPanel {
  dateRange: AnalyticsDateRange;
  financialKpis: FinancialKpis;
  trafficMetrics: TrafficMetrics;
  salesTrend: DailySalesPoint[];
  topProductsByUnits: ProductInsight[];
  topProductsByRevenue: ProductInsight[];
  stagnantProducts: StagnantProductInsight[];
}

/** @deprecated Usar StoreAnalyticsPanel para la vista simplificada. */
export interface SalesComparison {
  todayUsd: number;
  monthToDateUsd: number;
  todayLabel: string;
  monthLabel: string;
}

/** @deprecated */
export interface RegistrationMetrics {
  periodDays: number;
  uniqueVisitors: number;
  registrations: number;
  registrationRatePct: number;
  newCustomerProfiles: number;
  trackingEnabled: boolean;
}

/** @deprecated */
export interface TopProductInsight {
  productId: string;
  name: string;
  unitsSold: number;
  thumbUrl: string | null;
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
