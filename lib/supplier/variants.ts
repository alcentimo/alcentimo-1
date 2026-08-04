/** Variantes simples opcionales de un producto mayorista. */

export const SUPPLIER_VARIANT_ATTRIBUTES = [
  { value: "color", label: "Color" },
  { value: "modelo", label: "Modelo" },
  { value: "presentacion", label: "Presentación" },
  { value: "otro", label: "Otro" },
] as const;

export type SupplierVariantAttribute =
  (typeof SUPPLIER_VARIANT_ATTRIBUTES)[number]["value"];

export interface SupplierVariantOption {
  id: string;
  label: string;
  /** Extra opcional sobre el precio base (USD). */
  priceExtraUsd?: number;
}

export interface SupplierProductVariants {
  attribute: SupplierVariantAttribute;
  /** Etiqueta libre cuando attribute === "otro". */
  attributeLabel?: string;
  options: SupplierVariantOption[];
}

export function emptySupplierVariants(): SupplierProductVariants {
  return { attribute: "color", options: [] };
}

export function isSupplierVariantAttribute(
  value: unknown,
): value is SupplierVariantAttribute {
  return (
    value === "color" ||
    value === "modelo" ||
    value === "presentacion" ||
    value === "otro"
  );
}

export function supplierVariantAttributeLabel(
  variants: SupplierProductVariants,
): string {
  if (variants.attribute === "otro") {
    const custom = variants.attributeLabel?.trim();
    return custom || "Otro";
  }
  return (
    SUPPLIER_VARIANT_ATTRIBUTES.find((item) => item.value === variants.attribute)
      ?.label ?? "Variante"
  );
}

export function normalizeSupplierProductVariants(
  raw: unknown,
): SupplierProductVariants {
  if (!raw || typeof raw !== "object") {
    return emptySupplierVariants();
  }

  const record = raw as Record<string, unknown>;
  const attribute = isSupplierVariantAttribute(record.attribute)
    ? record.attribute
    : "color";
  const attributeLabel =
    typeof record.attributeLabel === "string"
      ? record.attributeLabel.trim().slice(0, 40)
      : undefined;

  const optionsRaw = Array.isArray(record.options) ? record.options : [];
  const options: SupplierVariantOption[] = [];
  const seen = new Set<string>();

  for (const entry of optionsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const option = entry as Record<string, unknown>;
    const label =
      typeof option.label === "string" ? option.label.trim().slice(0, 80) : "";
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let priceExtraUsd: number | undefined;
    if (option.priceExtraUsd != null && option.priceExtraUsd !== "") {
      const parsed = Number(option.priceExtraUsd);
      if (Number.isFinite(parsed) && parsed !== 0) {
        priceExtraUsd = Math.round(parsed * 100) / 100;
      }
    }

    options.push({
      id:
        typeof option.id === "string" && option.id.trim()
          ? option.id.trim().slice(0, 64)
          : crypto.randomUUID(),
      label,
      ...(priceExtraUsd != null ? { priceExtraUsd } : {}),
    });

    if (options.length >= 40) break;
  }

  return {
    attribute,
    ...(attribute === "otro" && attributeLabel
      ? { attributeLabel }
      : {}),
    options,
  };
}

/** Serializa para FormData / persistencia. */
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
  return variants?.options?.length ?? 0;
}
