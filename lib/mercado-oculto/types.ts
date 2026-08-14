import type { CatalogListItem } from "@/lib/database.types";
import { PUBLIC_CATALOG_LIST_SELECT } from "@/lib/inventory/constants";
import {
  normalizeDbPlan,
  resolveSubscriptionStatus,
} from "@/lib/plans/plan-activation";

export type MercadoProductCard = Pick<
  CatalogListItem,
  | "store_id"
  | "store_slug"
  | "store_name"
  | "product_id"
  | "product_slug"
  | "product_name"
  | "short_description"
  | "price_usd"
  | "thumb_url"
  | "category_name"
  | "available_stock"
  | "created_at"
>;

export function mapMercadoProductCard(
  row: CatalogListItem,
): MercadoProductCard {
  return {
    store_id: row.store_id,
    store_slug: row.store_slug,
    store_name: row.store_name,
    product_id: row.product_id,
    product_slug: row.product_slug,
    product_name: row.product_name,
    short_description: row.short_description,
    price_usd: row.price_usd,
    thumb_url: row.thumb_url,
    category_name: row.category_name,
    available_stock: row.available_stock,
    created_at: row.created_at,
  };
}

export const MERCADO_CATALOG_SELECT = PUBLIC_CATALOG_LIST_SELECT;

export function isPaidSubscriberProfile(row: {
  plan?: string | null;
  subscription_status?: string | null;
}): boolean {
  const plan = normalizeDbPlan(row.plan);
  if (plan === "FREE") return false;
  const status = resolveSubscriptionStatus(row.subscription_status);
  return status === "active" || status === "provisional";
}
