export type InboxSalesStatus = "new" | "negotiating" | "won" | "lost";

export const INBOX_SALES_STATUSES = new Set<InboxSalesStatus>([
  "new",
  "negotiating",
  "won",
  "lost",
]);

export const SALES_STATUS_OPTIONS: {
  value: InboxSalesStatus;
  label: string;
  selectClass: string;
}[] = [
  {
    value: "new",
    label: "Nuevo",
    selectClass:
      "inbox-sales-status-select inbox-sales-status-select--new",
  },
  {
    value: "negotiating",
    label: "En negociación",
    selectClass:
      "inbox-sales-status-select inbox-sales-status-select--negotiating",
  },
  {
    value: "won",
    label: "Ganado",
    selectClass: "inbox-sales-status-select inbox-sales-status-select--won",
  },
  {
    value: "lost",
    label: "Perdido",
    selectClass: "inbox-sales-status-select inbox-sales-status-select--lost",
  },
];

export function isInboxSalesStatus(value: unknown): value is InboxSalesStatus {
  return typeof value === "string" && INBOX_SALES_STATUSES.has(value as InboxSalesStatus);
}

export function getSalesStatusLabel(status: InboxSalesStatus): string {
  return (
    SALES_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}

export function getSalesStatusSelectClass(status: InboxSalesStatus): string {
  return (
    SALES_STATUS_OPTIONS.find((option) => option.value === status)?.selectClass ??
    "inbox-sales-status-select"
  );
}

export function normalizeSalesStatus(value: unknown): InboxSalesStatus {
  return isInboxSalesStatus(value) ? value : "new";
}
