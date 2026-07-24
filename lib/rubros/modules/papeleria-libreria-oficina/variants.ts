import type { VariantFormInput } from "@/lib/products/variants";
import type { ProductVariantJson } from "@/lib/products/variants";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  STATIONERY_FIELD_PRESENTATION,
  STATIONERY_FIELD_UNITS_PER_PACK,
  STATIONERY_SALE_MODE_PACK,
  STATIONERY_SALE_MODE_UNIT,
  STATIONERY_VARIANT_ATTR_SALE_MODE,
  STATIONERY_VARIANT_ATTR_UNITS_PER_SALE,
  getStationeryPackVariantLabel,
  getStationeryUnitsPerPackFromFields,
  isStationeryMultiPackPresentation,
  parseStationeryMetadata,
  parseStationeryUnitsPerPack,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";

export function isStationerySaleVariant(
  variant: Pick<VariantFormInput | ProductVariantJson, "attributes">,
): boolean {
  const mode = variant.attributes?.[STATIONERY_VARIANT_ATTR_SALE_MODE]?.trim();
  return mode === STATIONERY_SALE_MODE_PACK || mode === STATIONERY_SALE_MODE_UNIT;
}

export function areStationerySaleVariants(
  variants: Array<Pick<VariantFormInput | ProductVariantJson, "attributes">>,
): boolean {
  return variants.some(isStationerySaleVariant);
}

export function shouldUseStationerySaleVariants(
  extraFields: ProductExtraFieldsMap,
): boolean {
  return getStationeryUnitsPerPackFromFields(extraFields) != null;
}

export function syncStationerySaleVariants(
  extraFields: ProductExtraFieldsMap,
  currentVariants: VariantFormInput[],
): VariantFormInput[] {
  const presentation = extraFields[STATIONERY_FIELD_PRESENTATION] ?? "";
  const unitsPerPack = getStationeryUnitsPerPackFromFields(extraFields);

  if (!isStationeryMultiPackPresentation(presentation) || !unitsPerPack) {
    return currentVariants.filter((variant) => !isStationerySaleVariant(variant));
  }

  const packLabel = getStationeryPackVariantLabel(presentation);
  const existingPack = currentVariants.find(
    (variant) =>
      variant.attributes?.[STATIONERY_VARIANT_ATTR_SALE_MODE] ===
      STATIONERY_SALE_MODE_PACK,
  );
  const existingUnit = currentVariants.find(
    (variant) =>
      variant.attributes?.[STATIONERY_VARIANT_ATTR_SALE_MODE] ===
      STATIONERY_SALE_MODE_UNIT,
  );

  const manualVariants = currentVariants.filter(
    (variant) => !isStationerySaleVariant(variant),
  );

  return [
    ...manualVariants,
    {
      id: existingPack?.id,
      name: packLabel,
      priceExtraUsd: existingPack?.priceExtraUsd ?? "0",
      stock: "0",
      attributes: {
        [STATIONERY_VARIANT_ATTR_SALE_MODE]: STATIONERY_SALE_MODE_PACK,
        [STATIONERY_VARIANT_ATTR_UNITS_PER_SALE]: String(unitsPerPack),
      },
    },
    {
      id: existingUnit?.id,
      name: "Por unidad",
      priceExtraUsd: existingUnit?.priceExtraUsd ?? "0",
      stock: "0",
      attributes: {
        [STATIONERY_VARIANT_ATTR_SALE_MODE]: STATIONERY_SALE_MODE_UNIT,
        [STATIONERY_VARIANT_ATTR_UNITS_PER_SALE]: "1",
      },
    },
  ];
}

export function resolveStationeryUnitsPerSale(
  variant: Pick<ProductVariantJson | VariantFormInput, "attributes">,
  metadata?: Record<string, unknown> | null,
): number {
  const raw = variant.attributes?.[STATIONERY_VARIANT_ATTR_UNITS_PER_SALE]?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
  }

  const stationery = parseStationeryMetadata(metadata);
  if (
    variant.attributes?.[STATIONERY_VARIANT_ATTR_SALE_MODE] ===
      STATIONERY_SALE_MODE_PACK &&
    stationery
  ) {
    return stationery.units_per_pack;
  }

  return 1;
}

export function resolveStationeryVariantAvailableStock(
  baseStock: number,
  unitsPerSale: number,
): number {
  const safeBase = Math.max(0, Math.floor(baseStock));
  const safeUnits = Math.max(1, Math.floor(unitsPerSale));
  if (safeUnits === 1) return safeBase;
  return Math.floor(safeBase / safeUnits);
}

export function resolveStationeryOrderStockUnits(
  quantity: number,
  variant: Pick<ProductVariantJson, "attributes"> | null | undefined,
  metadata?: Record<string, unknown> | null,
): number {
  const safeQty = Math.max(0, Math.floor(quantity));
  if (safeQty === 0) return 0;
  const unitsPerSale = resolveStationeryUnitsPerSale(variant ?? {}, metadata);
  return safeQty * unitsPerSale;
}

export function formatStationeryStockSummary(input: {
  baseStock: number;
  presentation?: string | null;
  unitsPerPack?: number | null;
}): string | null {
  const { baseStock, presentation, unitsPerPack } = input;
  if (!unitsPerPack || unitsPerPack < 2 || baseStock <= 0) return null;
  const packs = Math.floor(baseStock / unitsPerPack);
  const loose = baseStock % unitsPerPack;
  const label = (presentation ?? "empaque").toLowerCase();
  if (packs <= 0) {
    return `${baseStock} unidades sueltas (menos de 1 ${label}).`;
  }
  if (loose === 0) {
    return `${baseStock} unidades = ${packs} ${label}${packs === 1 ? "" : "s"} complet${packs === 1 ? "o" : "os"}.`;
  }
  return `${baseStock} unidades = ${packs} ${label}${packs === 1 ? "" : "s"} + ${loose} suelta${loose === 1 ? "" : "s"}.`;
}
