import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  COLLECTIBLE_FIELD_CONDITION,
  COLLECTIBLE_FIELD_EDITION,
  COLLECTIBLE_FIELD_ETA,
  COLLECTIBLE_FIELD_PREORDER,
  getCollectibleFieldLabels,
  isCollectiblePreorder,
} from "@/lib/rubros/modules/coleccionables/config";

export interface CollectibleBadge {
  kind: "condition" | "edition" | "preorder";
  label: string;
}

export function pickCollectibleValues(
  fields: ProductExtraFieldsMap,
): ProductExtraFieldsMap {
  const picked: ProductExtraFieldsMap = {};
  for (const label of getCollectibleFieldLabels()) {
    picked[label] = fields[label] ?? "";
  }
  return picked;
}

/** Badges para tarjetas del catálogo público. */
export function getCollectibleBadgesFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CollectibleBadge[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.extra_fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const fields = raw as Record<string, unknown>;
  const badges: CollectibleBadge[] = [];

  const condition = fields[COLLECTIBLE_FIELD_CONDITION];
  if (typeof condition === "string" && condition.trim()) {
    badges.push({ kind: "condition", label: condition.trim() });
  }

  const edition = fields[COLLECTIBLE_FIELD_EDITION];
  if (typeof edition === "string" && edition.trim()) {
    badges.push({ kind: "edition", label: edition.trim() });
  }

  if (isCollectiblePreorder(String(fields[COLLECTIBLE_FIELD_PREORDER] ?? ""))) {
    const etaRaw = fields[COLLECTIBLE_FIELD_ETA];
    const eta = typeof etaRaw === "string" ? etaRaw.trim() : "";
    badges.push({
      kind: "preorder",
      label: eta ? `Preventa · ${eta}` : "Preventa",
    });
  }

  return badges;
}
