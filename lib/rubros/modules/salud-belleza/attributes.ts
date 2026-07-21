import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  BEAUTY_FIELD_INGREDIENTS,
  BEAUTY_FIELD_SKIN,
  getBeautyFieldLabels,
} from "@/lib/rubros/modules/salud-belleza/config";

export interface BeautyBadge {
  kind: "skin" | "ingredients";
  label: string;
}

export function pickBeautyValues(
  fields: ProductExtraFieldsMap,
): ProductExtraFieldsMap {
  const picked: ProductExtraFieldsMap = {};
  for (const label of getBeautyFieldLabels()) {
    picked[label] = fields[label] ?? "";
  }
  return picked;
}

/** Badges para tarjetas del catálogo público. */
export function getBeautyBadgesFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): BeautyBadge[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.extra_fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const fields = raw as Record<string, unknown>;
  const badges: BeautyBadge[] = [];

  const skin = fields[BEAUTY_FIELD_SKIN];
  if (typeof skin === "string" && skin.trim()) {
    badges.push({ kind: "skin", label: skin.trim() });
  }

  const ingredients = fields[BEAUTY_FIELD_INGREDIENTS];
  if (typeof ingredients === "string" && ingredients.trim()) {
    const short =
      ingredients.trim().length > 42
        ? `${ingredients.trim().slice(0, 40)}…`
        : ingredients.trim();
    badges.push({ kind: "ingredients", label: short });
  }

  return badges;
}
