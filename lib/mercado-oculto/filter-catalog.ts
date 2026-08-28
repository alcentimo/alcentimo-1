import type {
  MercadoCatalogFacets,
  MercadoProductCard,
} from "@/lib/mercado-oculto/types";
import { isSupplierProductCategory } from "@/lib/supplier/categories";

export type MercadoCatalogFilters = {
  q: string;
  category: string;
  min: string;
  max: string;
  supplier: string;
  ship: string;
};

export const EMPTY_MERCADO_FILTERS: MercadoCatalogFilters = {
  q: "",
  category: "",
  min: "",
  max: "",
  supplier: "",
  ship: "",
};

export function filtersFromSearchParams(
  params: URLSearchParams | { get(name: string): string | null },
): MercadoCatalogFilters {
  return {
    q: params.get("q")?.trim() ?? "",
    category: params.get("category")?.trim() ?? "",
    min: params.get("min")?.trim() ?? "",
    max: params.get("max")?.trim() ?? "",
    supplier: params.get("supplier")?.trim() ?? "",
    ship: params.get("ship")?.trim() ?? "",
  };
}

export function filtersToQueryString(filters: MercadoCatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.min) params.set("min", filters.min);
  if (filters.max) params.set("max", filters.max);
  if (filters.supplier) params.set("supplier", filters.supplier);
  if (filters.ship) params.set("ship", filters.ship);
  return params.toString();
}

export function filterMercadoProducts(
  products: MercadoProductCard[],
  filters: MercadoCatalogFilters,
): MercadoProductCard[] {
  const q = filters.q.trim().toLowerCase();
  const category =
    filters.category && isSupplierProductCategory(filters.category)
      ? filters.category
      : "";
  const min = filters.min ? Number(filters.min) : undefined;
  const max = filters.max ? Number(filters.max) : undefined;
  const supplier = filters.supplier.trim();
  const freeShippingOnly = filters.ship === "free";

  return products.filter((product) => {
    if (category && product.category !== category) return false;
    if (supplier && product.seller_user_id !== supplier) return false;
    if (freeShippingOnly && !product.free_shipping) return false;
    if (
      typeof min === "number" &&
      Number.isFinite(min) &&
      product.price_usd < min
    ) {
      return false;
    }
    if (
      typeof max === "number" &&
      Number.isFinite(max) &&
      max > 0 &&
      product.price_usd > max
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        product.product_name,
        product.short_description ?? "",
        product.category_name,
        product.supplier_label,
        product.brand ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function emptyMercadoFacets(): MercadoCatalogFacets {
  return {
    categories: [],
    suppliers: [],
    priceMin: 0,
    priceMax: 0,
    freeShippingCount: 0,
  };
}
