import {
  isSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";

export const SUPPLIER_LAST_CATEGORY_STORAGE_KEY =
  "alcentimo-supplier-last-product-category";

export function readLastSupplierProductCategory(
  fallback: SupplierProductCategory = "otros",
): SupplierProductCategory {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SUPPLIER_LAST_CATEGORY_STORAGE_KEY);
    return isSupplierProductCategory(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function writeLastSupplierProductCategory(
  category: SupplierProductCategory,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUPPLIER_LAST_CATEGORY_STORAGE_KEY, category);
  } catch {
    /* ignore quota / private mode */
  }
}
