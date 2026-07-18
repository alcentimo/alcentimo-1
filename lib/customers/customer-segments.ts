import type { StoreCustomerSummary } from "@/lib/customers/store-customer-stats";

export type CustomerSegment = "all" | "vip" | "inactive";

export const CUSTOMER_SEGMENT_TABS: {
  id: CustomerSegment;
  label: string;
}[] = [
  { id: "all", label: "Todos" },
  { id: "vip", label: "Clientes VIP" },
  { id: "inactive", label: "Inactivos" },
];

const VIP_MIN_ORDERS = 3;
const INACTIVE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export function isVipCustomer(customer: StoreCustomerSummary): boolean {
  return customer.orderCount > VIP_MIN_ORDERS;
}

export function isInactiveCustomer(
  customer: StoreCustomerSummary,
  referenceDate = new Date(),
): boolean {
  if (!customer.lastOrderAt) return true;

  const lastOrderMs = new Date(customer.lastOrderAt).getTime();
  const diffDays = (referenceDate.getTime() - lastOrderMs) / MS_PER_DAY;
  return diffDays > INACTIVE_DAYS;
}

export function matchesCustomerSegment(
  customer: StoreCustomerSummary,
  segment: CustomerSegment,
  referenceDate = new Date(),
): boolean {
  if (segment === "all") return true;
  if (segment === "vip") return isVipCustomer(customer);
  return isInactiveCustomer(customer, referenceDate);
}

export function sortCustomersByRecentPurchase(
  customers: StoreCustomerSummary[],
): StoreCustomerSummary[] {
  return [...customers].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;

    if (bTime !== aTime) return bTime - aTime;

    return (
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
  });
}

export interface CustomerMonthGroup {
  key: string;
  label: string;
  customers: StoreCustomerSummary[];
}

function monthSortKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthGroupLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupCustomersByActivityMonth(
  customers: StoreCustomerSummary[],
): CustomerMonthGroup[] {
  const groups = new Map<string, CustomerMonthGroup>();

  for (const customer of customers) {
    if (!customer.lastOrderAt) {
      const key = "sin-compras";
      const existing = groups.get(key);
      if (existing) {
        existing.customers.push(customer);
      } else {
        groups.set(key, {
          key,
          label: "Sin compras recientes",
          customers: [customer],
        });
      }
      continue;
    }

    const date = new Date(customer.lastOrderAt);
    const key = monthSortKey(date);
    const existing = groups.get(key);
    if (existing) {
      existing.customers.push(customer);
    } else {
      groups.set(key, {
        key,
        label: formatMonthGroupLabel(date),
        customers: [customer],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === "sin-compras") return 1;
    if (b.key === "sin-compras") return -1;
    return b.key.localeCompare(a.key);
  });
}

export function computeCustomerMetrics(customers: StoreCustomerSummary[]) {
  const totals = customers.reduce(
    (acc, customer) => {
      acc.count += 1;
      acc.orders += customer.orderCount;
      acc.spent += customer.totalSpentUsd;
      return acc;
    },
    { count: 0, orders: 0, spent: 0 },
  );

  const averageTicket =
    totals.orders > 0 ? totals.spent / totals.orders : 0;

  return { ...totals, averageTicket };
}
