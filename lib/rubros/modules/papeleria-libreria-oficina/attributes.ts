import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  STATIONERY_FIELD_BRAND,
  STATIONERY_FIELD_FORMAT,
  STATIONERY_FIELD_PRESENTATION,
  STATIONERY_FIELD_SEGMENT,
  STATIONERY_FIELD_UNITS_PER_PACK,
  getStationeryFieldLabels,
  getStationeryUnitsPerPackFromFields,
  isStationeryMultiPackPresentation,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";

export interface StationeryBadge {
  kind: "presentation" | "segment" | "format" | "brand" | "units";
  label: string;
}

export function pickStationeryValues(
  fields: ProductExtraFieldsMap,
  categorySlug?: string | null,
): ProductExtraFieldsMap {
  const picked: ProductExtraFieldsMap = {};
  for (const label of getStationeryFieldLabels(categorySlug)) {
    picked[label] = fields[label] ?? "";
  }
  if (isStationeryMultiPackPresentation(fields[STATIONERY_FIELD_PRESENTATION])) {
    picked[STATIONERY_FIELD_UNITS_PER_PACK] =
      fields[STATIONERY_FIELD_UNITS_PER_PACK] ?? "";
  }
  return picked;
}

/** Badges para tarjetas del catálogo público. */
export function getStationeryBadgesFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): StationeryBadge[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.extra_fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const fields = raw as Record<string, unknown>;
  const badges: StationeryBadge[] = [];

  const presentation = fields[STATIONERY_FIELD_PRESENTATION];
  if (typeof presentation === "string" && presentation.trim()) {
    badges.push({
      kind: "presentation",
      label: presentation.trim(),
    });
  }

  const unitsPerPack = getStationeryUnitsPerPackFromFields(
    fields as Record<string, string>,
  );
  if (unitsPerPack && typeof presentation === "string" && presentation.trim()) {
    badges.push({
      kind: "units",
      label: `${unitsPerPack} u./${presentation.trim().toLowerCase()}`,
    });
  }

  const segment = fields[STATIONERY_FIELD_SEGMENT];
  if (typeof segment === "string" && segment.trim()) {
    badges.push({ kind: "segment", label: segment.trim() });
  }

  const format = fields[STATIONERY_FIELD_FORMAT];
  if (typeof format === "string" && format.trim()) {
    badges.push({ kind: "format", label: format.trim() });
  }

  const brand = fields[STATIONERY_FIELD_BRAND];
  if (typeof brand === "string" && brand.trim()) {
    badges.push({ kind: "brand", label: brand.trim() });
  }

  return badges.slice(0, 4);
}
