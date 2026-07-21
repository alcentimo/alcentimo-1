export const MAX_STORE_LOCATIONS = 5;

export interface StoreLocation {
  id: string;
  store_id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VariantLocationStock {
  variant_id: string;
  location_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  available_stock: number;
}

export type OrderFulfillmentType = "delivery" | "pickup" | "shipping";

export function availableFromLocationStock(
  stock: Pick<VariantLocationStock, "stock_quantity" | "reserved_quantity">,
): number {
  return Math.max(0, stock.stock_quantity - stock.reserved_quantity);
}

export function mapStoreLocationRow(row: Record<string, unknown>): StoreLocation {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    name: String(row.name ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    phone: (row.phone as string | null) ?? null,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}
