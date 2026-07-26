export interface GenerateAnalyticsInsightInput {
  storeName: string;
  periodLabel: string;
  periodSalesUsd: number;
  salesChangeDescription: string;
  transactionCount: number;
  transactionsChangeDescription: string;
  averageOrderValueUsd: number;
  averageTicketChangeDescription: string;
  busiestDaysDescription: string;
  topProductDescription: string;
  stagnantProductCount: number;
  conversionRateDescription: string;
}

export interface GenerateAnalyticsInsightResult {
  insight: string;
}
