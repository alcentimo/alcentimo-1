export type CustomerMessageGoal = "reactivacion" | "agradecimiento";

export interface CustomerMessageGoalOption {
  value: CustomerMessageGoal;
  label: string;
  description: string;
}

export const CUSTOMER_MESSAGE_GOAL_OPTIONS: CustomerMessageGoalOption[] = [
  {
    value: "reactivacion",
    label: "Reactivación",
    description: "Para clientes inactivos o que no compran hace tiempo.",
  },
  {
    value: "agradecimiento",
    label: "Agradecimiento",
    description: "Para clientes frecuentes o VIP que ya te apoyan.",
  },
];

export interface GenerateCustomerWhatsAppMessageInput {
  customerName: string;
  orderCount: number;
  totalSpentUsd: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  storeName: string;
  goal: CustomerMessageGoal;
}

export interface GenerateCustomerWhatsAppMessageResult {
  message: string;
}
