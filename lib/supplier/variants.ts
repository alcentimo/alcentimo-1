/** Variantes opcionales de un producto mayorista (1 eje o matriz talla × color). */

import type { ProductVariantJson } from "@/lib/products/variants";
import {
  ROPA_MODA_ATTR_COLOR,
  ROPA_MODA_ATTR_TALLA,
} from "@/lib/rubros/modules/ropa-moda/config";

export const SUPPLIER_VARIANT_ATTRIBUTES = [
  { value: "talla", label: "Talla" },
  { value: "color", label: "Color" },
  { value: "modelo", label: "Modelo" },
  { value: "presentacion", label: "Presentación" },
  { value: "otro", label: "Otro" },
] as const;

export type SupplierVariantAttribute =
  (typeof SUPPLIER_VARIANT_ATTRIBUTES)[number]["value"];

export const SUPPLIER_FASHION_ATTRIBUTE_PRESETS: ReadonlyArray<{
  value: "talla" | "color";
  label: string;
}> = [
  { value: "talla", label: "Talla" },
  { value: "color", label: "Color" },
];

export const MAX_SUPPLIER_VARIANT_SKUS = 80;

export interface SupplierVariantOption {
  id: string;
  label: string;
  /** Extra opcional sobre el precio base (USD). */
  priceExtraUsd?: number;
  /** Stock de esta opción (eje único). */
  stock?: number;
  /** Precio mayorista absoluto de esta opción (USD). */
  priceUsd?: number;
}

export interface SupplierVariantAxis {
  id: string;
  attribute: SupplierVariantAttribute;
  attributeLabel?: string;
  values: string[];
}

export interface SupplierVariantSku {
  id: string;
  /** Valor elegido por id de eje. */
  selection: Record<string, string>;
  label: string;
  stock: number;
  /** Precio mayorista de esta combinación (USD). */
  priceUsd: number;
}

export interface SupplierProductVariants {
  attribute: SupplierVariantAttribute;
  /** Etiqueta libre cuando attribute === "otro". */
  attributeLabel?: string;
  options: SupplierVariantOption[];
  /** Varios atributos a la vez (p. ej. Talla + Color). */
  axes?: SupplierVariantAxis[];
  /** Combinaciones cartesianas con stock y precio propios. */
  skus?: SupplierVariantSku[];
  /**
   * Si es true, cada SKU tiene precio propio.
   * Si es false o ausente, rige el costo (USD) del producto.
   */
  differentiatedPrices?: boolean;
}

export function emptySupplierVariants(): SupplierProductVariants {
  return { attribute: "color", options: [] };
}

export function emptySupplierFashionVariants(): SupplierProductVariants {
  return {
    attribute: "talla",
    options: [],
    axes: [
      { id: "axis-talla", attribute: "talla", values: [] },
      { id: "axis-color", attribute: "color", values: [] },
    ],
    skus: [],
  };
}

export function isSupplierVariantAttribute(
  value: unknown,
): value is SupplierVariantAttribute {
  return (
    value === "talla" ||
    value === "color" ||
    value === "modelo" ||
    value === "presentacion" ||
    value === "otro"
  );
}

export function supplierAxisLabel(axis: SupplierVariantAxis): string {
  if (axis.attribute === "otro") {
    const custom = axis.attributeLabel?.trim();
    return custom || "Otro";
  }
  return (
    SUPPLIER_VARIANT_ATTRIBUTES.find((item) => item.value === axis.attribute)
      ?.label ?? "Atributo"
  );
}

export function supplierVariantAttributeLabel(
  variants: SupplierProductVariants,
): string {
  const axes = variants.axes?.filter((axis) => axis.values.length > 0) ?? [];
  if (axes.length > 0) {
    return axes.map(supplierAxisLabel).join(" + ");
  }
  if (variants.attribute === "otro") {
    const custom = variants.attributeLabel?.trim();
    return custom || "Otro";
  }
  return (
    SUPPLIER_VARIANT_ATTRIBUTES.find((item) => item.value === variants.attribute)
      ?.label ?? "Variante"
  );
}

function parseMoney(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * 100) / 100;
}

function parseStock(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.max(0, Math.floor(parsed));
}

function normalizeAxisValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const values: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const value = typeof entry === "string" ? entry.trim().slice(0, 40) : "";
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= 24) break;
  }
  return values;
}

function normalizeAxes(raw: unknown): SupplierVariantAxis[] {
  if (!Array.isArray(raw)) return [];
  const axes: SupplierVariantAxis[] = [];
  const seenAttr = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const attribute = isSupplierVariantAttribute(row.attribute)
      ? row.attribute
      : "otro";
    const attrKey =
      attribute === "otro"
        ? `otro:${typeof row.attributeLabel === "string" ? row.attributeLabel.trim().toLowerCase() : ""}`
        : attribute;
    if (seenAttr.has(attrKey)) continue;
    seenAttr.add(attrKey);

    const values = normalizeAxisValues(row.values);
    axes.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim().slice(0, 64)
          : `axis-${attribute}-${axes.length}`,
      attribute,
      ...(attribute === "otro" && typeof row.attributeLabel === "string"
        ? { attributeLabel: row.attributeLabel.trim().slice(0, 40) }
        : {}),
      values,
    });
    if (axes.length >= 4) break;
  }

  return axes;
}

export function cartesianSelections(
  axes: SupplierVariantAxis[],
): Record<string, string>[] {
  const active = axes.filter((axis) => axis.values.length > 0);
  if (active.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const axis of active) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of axis.values) {
        next.push({ ...combo, [axis.id]: value });
      }
    }
    combos = next;
    if (combos.length > MAX_SUPPLIER_VARIANT_SKUS) {
      return combos.slice(0, MAX_SUPPLIER_VARIANT_SKUS);
    }
  }
  return combos;
}

export function formatSupplierSkuLabel(
  axes: SupplierVariantAxis[],
  selection: Record<string, string>,
): string {
  return axes
    .filter((axis) => axis.values.length > 0)
    .map((axis) => selection[axis.id] ?? "")
    .filter(Boolean)
    .join(" / ");
}

export function skuSelectionKey(selection: Record<string, string>): string {
  return Object.entries(selection)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value.trim().toLowerCase()}`)
    .join("||");
}

export function rebuildSupplierSkus(
  axes: SupplierVariantAxis[],
  previous: SupplierVariantSku[] | undefined,
): SupplierVariantSku[] {
  const prevByKey = new Map(
    (previous ?? []).map((sku) => [skuSelectionKey(sku.selection), sku]),
  );
  return cartesianSelections(axes).map((selection) => {
    const key = skuSelectionKey(selection);
    const prev = prevByKey.get(key);
    return {
      id: prev?.id ?? crypto.randomUUID(),
      selection,
      label: formatSupplierSkuLabel(axes, selection),
      stock: prev?.stock ?? 0,
      priceUsd: prev?.priceUsd ?? 0,
    };
  });
}

function normalizeSkus(
  raw: unknown,
  axes: SupplierVariantAxis[],
): SupplierVariantSku[] {
  const generated = cartesianSelections(axes);
  if (generated.length === 0) return [];

  const rawList = Array.isArray(raw) ? raw : [];
  const byKey = new Map<string, SupplierVariantSku>();

  for (const entry of rawList) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const selectionRaw =
      row.selection && typeof row.selection === "object"
        ? (row.selection as Record<string, unknown>)
        : {};
    const selection: Record<string, string> = {};
    for (const axis of axes) {
      const value = selectionRaw[axis.id];
      if (typeof value === "string" && value.trim()) {
        selection[axis.id] = value.trim().slice(0, 40);
      }
    }
    const key = skuSelectionKey(selection);
    if (!key) continue;
    byKey.set(key, {
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim().slice(0, 64)
          : crypto.randomUUID(),
      selection,
      label:
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim().slice(0, 120)
          : formatSupplierSkuLabel(axes, selection),
      stock: parseStock(row.stock) ?? 0,
      priceUsd: parseMoney(row.priceUsd) ?? 0,
    });
  }

  return generated.map((selection) => {
    const prev = byKey.get(skuSelectionKey(selection));
    return {
      id: prev?.id ?? crypto.randomUUID(),
      selection,
      label: formatSupplierSkuLabel(axes, selection),
      stock: prev?.stock ?? 0,
      priceUsd: prev?.priceUsd ?? 0,
    };
  });
}

function optionsFromSkus(skus: SupplierVariantSku[]): SupplierVariantOption[] {
  return skus.map((sku) => ({
    id: sku.id,
    label: sku.label,
    stock: sku.stock,
    priceUsd: sku.priceUsd,
    ...(sku.priceUsd !== 0 ? { priceExtraUsd: sku.priceUsd } : {}),
  }));
}

function normalizeOptions(raw: unknown): SupplierVariantOption[] {
  if (!Array.isArray(raw)) return [];
  const options: SupplierVariantOption[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const option = entry as Record<string, unknown>;
    const label =
      typeof option.label === "string" ? option.label.trim().slice(0, 80) : "";
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const priceExtraUsd = parseMoney(option.priceExtraUsd);
    const priceUsd = parseMoney(option.priceUsd);
    const stock = parseStock(option.stock);

    options.push({
      id:
        typeof option.id === "string" && option.id.trim()
          ? option.id.trim().slice(0, 64)
          : crypto.randomUUID(),
      label,
      ...(priceExtraUsd != null && priceExtraUsd !== 0
        ? { priceExtraUsd }
        : {}),
      ...(priceUsd != null ? { priceUsd } : {}),
      ...(stock != null ? { stock } : {}),
    });

    if (options.length >= MAX_SUPPLIER_VARIANT_SKUS) break;
  }

  return options;
}

/** Serializa para FormData / persistencia. */
export function normalizeSupplierProductVariants(
  raw: unknown,
): SupplierProductVariants {
  if (!raw || typeof raw !== "object") {
    return emptySupplierVariants();
  }

  const record = raw as Record<string, unknown>;
  let axes = normalizeAxes(record.axes);
  const attribute = isSupplierVariantAttribute(record.attribute)
    ? record.attribute
    : axes[0]?.attribute ?? "color";
  const attributeLabel =
    typeof record.attributeLabel === "string"
      ? record.attributeLabel.trim().slice(0, 40)
      : undefined;

  const options = normalizeOptions(record.options);

  if (axes.length === 0 && options.length > 0) {
    axes = [
      {
        id: "axis-legacy",
        attribute,
        ...(attribute === "otro" && attributeLabel ? { attributeLabel } : {}),
        values: options.map((option) => option.label),
      },
    ];
  }

  const skus = axes.some((axis) => axis.values.length > 0)
    ? normalizeSkus(record.skus, axes)
    : [];

  const derivedOptions =
    skus.length > 0
      ? optionsFromSkus(skus)
      : options;

  const differentiatedPrices = record.differentiatedPrices === true;

  return {
    attribute,
    ...(attribute === "otro" && attributeLabel ? { attributeLabel } : {}),
    options: derivedOptions,
    ...(axes.length > 0 ? { axes } : {}),
    ...(skus.length > 0 ? { skus } : {}),
    ...(differentiatedPrices ? { differentiatedPrices: true } : {}),
  };
}

export function serializeSupplierVariants(
  variants: SupplierProductVariants,
): string {
  return JSON.stringify(normalizeSupplierProductVariants(variants));
}

export function parseSupplierVariantsFromForm(
  value: FormDataEntryValue | null,
): SupplierProductVariants {
  if (typeof value !== "string" || !value.trim()) {
    return emptySupplierVariants();
  }
  try {
    return normalizeSupplierProductVariants(JSON.parse(value));
  } catch {
    return emptySupplierVariants();
  }
}

export function countSupplierVariantOptions(
  variants: SupplierProductVariants | null | undefined,
): number {
  if (!variants) return 0;
  if (variants.skus && variants.skus.length > 0) return variants.skus.length;
  return variants.options?.length ?? 0;
}

export function sumSupplierVariantStock(
  variants: SupplierProductVariants | null | undefined,
): number | null {
  if (!variants) return null;
  if (variants.skus && variants.skus.length > 0) {
    return variants.skus.reduce((sum, sku) => sum + Math.max(0, sku.stock), 0);
  }
  const optionStocks = variants.options
    .map((option) => option.stock)
    .filter((stock): stock is number => stock != null);
  if (optionStocks.length === 0) return null;
  return optionStocks.reduce((sum, stock) => sum + Math.max(0, stock), 0);
}

export function hasSupplierMultiAttributeVariants(
  variants: SupplierProductVariants,
): boolean {
  const axes = variants.axes?.filter((axis) => axis.values.length > 0) ?? [];
  return axes.length >= 2;
}

export function applyUniformPriceToSupplierSkus(
  variants: SupplierProductVariants,
  priceUsd: number,
): SupplierProductVariants {
  const price =
    Number.isFinite(priceUsd) && priceUsd >= 0
      ? Math.round(priceUsd * 100) / 100
      : 0;
  const skus = (variants.skus ?? []).map((sku) => ({
    ...sku,
    priceUsd: price,
  }));
  return {
    ...variants,
    skus,
    differentiatedPrices: false,
    options: skus.length > 0 ? optionsFromSkus(skus) : variants.options,
  };
}

export function supplierSkusUseDistinctPrices(
  variants: SupplierProductVariants,
  basePriceUsd: number,
): boolean {
  if (variants.differentiatedPrices) return true;
  const skus = variants.skus ?? [];
  if (skus.length === 0) return false;
  const roundedBase = Math.round(basePriceUsd * 100) / 100;
  const prices = new Set(
    skus.map((sku) => Math.round((Number(sku.priceUsd) || 0) * 100) / 100),
  );
  if (prices.size > 1) return true;
  const only = [...prices][0] ?? 0;
  return only > 0 && Math.abs(only - roundedBase) > 0.009;
}

/**
 * Valida SKUs cartesianos de Ropa y moda.
 * Solo exige stock (y precio si está habilitado) en las filas generadas.
 * Ejes vacíos (p. ej. Color sin chips, o “Otra talla” sin texto) se ignoran.
 */
export function validateSupplierFashionVariants(
  variants: SupplierProductVariants,
  options?: { requireSkuPrice?: boolean },
): string | null {
  const axes = variants.axes ?? [];
  const active = axes.filter((axis) => axis.values.length > 0);
  if (active.length === 0) return null;

  const skus = variants.skus ?? [];
  if (skus.length === 0) {
    return "Selecciona al menos un valor (talla o color) para generar las combinaciones.";
  }

  const requireSkuPrice =
    options?.requireSkuPrice ?? Boolean(variants.differentiatedPrices);

  for (const sku of skus) {
    if (!Number.isInteger(sku.stock) || sku.stock < 0) {
      return `Indica el stock de la variante «${sku.label}».`;
    }
    if (requireSkuPrice && (!Number.isFinite(sku.priceUsd) || sku.priceUsd <= 0)) {
      return `Indica el precio en USD de la variante «${sku.label}».`;
    }
  }

  return null;
}

function attributeKeyForAxis(axis: SupplierVariantAxis): string {
  if (axis.attribute === "talla") return ROPA_MODA_ATTR_TALLA;
  if (axis.attribute === "color") return ROPA_MODA_ATTR_COLOR;
  if (axis.attribute === "otro") {
    return (
      axis.attributeLabel
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .slice(0, 40) || "otro"
    );
  }
  return axis.attribute;
}

export function supplierSkuCatalogAttributes(
  variants: SupplierProductVariants,
  sku: SupplierVariantSku,
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const axis of variants.axes ?? []) {
    const value = sku.selection[axis.id];
    if (!value) continue;
    attrs[attributeKeyForAxis(axis)] = value;
  }
  return attrs;
}

/** Convierte variantes mayoristas al JSON del catálogo del dropshipper. */
export function supplierVariantsToCatalogJson(
  variants: SupplierProductVariants,
  basePriceUsd = 0,
): ProductVariantJson[] {
  const normalized = normalizeSupplierProductVariants(variants);
  const skus = normalized.skus ?? [];

  if (skus.length > 0) {
    return skus.map((sku) => ({
      id: sku.id,
      name: sku.label,
      price_extra_usd: Math.round((sku.priceUsd - basePriceUsd) * 100) / 100,
      stock: sku.stock,
      attributes: supplierSkuCatalogAttributes(normalized, sku),
    }));
  }

  if (normalized.options.length === 0) return [];

  const attributeKey =
    supplierVariantAttributeLabel(normalized)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 40) || "variante";

  return normalized.options.map((option) => ({
    id: option.id,
    name: option.label,
    price_extra_usd: Number(option.priceExtraUsd) || 0,
    stock: option.stock ?? 0,
    attributes: { [attributeKey]: option.label },
  }));
}

export interface SupplierFashionCatalogSku {
  id: string;
  talla: string;
  color: string;
  label: string;
  stock: number;
  priceUsd: number;
}

export function listSupplierFashionCatalogSkus(
  variants: SupplierProductVariants,
): SupplierFashionCatalogSku[] {
  const normalized = normalizeSupplierProductVariants(variants);
  const tallaAxis = (normalized.axes ?? []).find(
    (axis) => axis.attribute === "talla",
  );
  const colorAxis = (normalized.axes ?? []).find(
    (axis) => axis.attribute === "color",
  );
  if (!tallaAxis || !colorAxis || !normalized.skus?.length) return [];

  return normalized.skus
    .map((sku) => ({
      id: sku.id,
      talla: sku.selection[tallaAxis.id] ?? "",
      color: sku.selection[colorAxis.id] ?? "",
      label: sku.label,
      stock: sku.stock,
      priceUsd: sku.priceUsd,
    }))
    .filter((sku) => sku.talla && sku.color);
}
