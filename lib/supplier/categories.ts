/** Categorías del catálogo mayorista (hub de proveedores). */

export const SUPPLIER_PRODUCT_CATEGORIES = [
  { value: "electronica", label: "Electrónica" },
  { value: "hogar", label: "Hogar" },
  { value: "belleza", label: "Belleza" },
  { value: "accesorios", label: "Accesorios" },
  { value: "alimentos", label: "Alimentos y bebidas" },
  { value: "ropa", label: "Ropa y moda" },
  { value: "salud", label: "Salud" },
  { value: "juguetes", label: "Juguetes" },
  { value: "papeleria", label: "Papelería" },
  { value: "automotriz", label: "Automotriz" },
  { value: "otros", label: "Otros" },
] as const;

export type SupplierProductCategory =
  (typeof SUPPLIER_PRODUCT_CATEGORIES)[number]["value"];

const CATEGORY_SET = new Set<string>(
  SUPPLIER_PRODUCT_CATEGORIES.map((item) => item.value),
);

export function isSupplierProductCategory(
  value: unknown,
): value is SupplierProductCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

export function normalizeSupplierProductCategory(
  value: unknown,
): SupplierProductCategory {
  return isSupplierProductCategory(value) ? value : "otros";
}

export function supplierCategoryLabel(
  value: string | null | undefined,
): string {
  const found = SUPPLIER_PRODUCT_CATEGORIES.find((item) => item.value === value);
  return found?.label ?? "Otros";
}

const SUPPLIER_CATEGORY_ORDER = new Map(
  SUPPLIER_PRODUCT_CATEGORIES.map((item, index) => [item.value, index]),
);

export function supplierCategorySortOrder(
  value: string | null | undefined,
): number {
  if (!isSupplierProductCategory(value)) {
    return SUPPLIER_PRODUCT_CATEGORIES.length + 1;
  }
  return SUPPLIER_CATEGORY_ORDER.get(value) ?? SUPPLIER_PRODUCT_CATEGORIES.length;
}
