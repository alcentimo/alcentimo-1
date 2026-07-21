import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { getTechSpecLabels } from "@/lib/rubros/modules/tecnologia/config";

export interface TechSpecChip {
  label: string;
  value: string;
}

/** Extrae chips de specs desde metadata.extra_fields para el catálogo. */
export function getTechSpecChipsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  categorySlug?: string | null,
): TechSpecChip[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.extra_fields;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const preferred = getTechSpecLabels(categorySlug);
  const chips: TechSpecChip[] = [];
  const seen = new Set<string>();

  for (const label of preferred) {
    const value = (raw as Record<string, unknown>)[label];
    if (typeof value === "string" && value.trim()) {
      chips.push({ label, value: value.trim() });
      seen.add(label);
    }
  }

  for (const [label, value] of Object.entries(raw as Record<string, unknown>)) {
    if (seen.has(label)) continue;
    if (typeof value === "string" && value.trim()) {
      chips.push({ label, value: value.trim() });
    }
  }

  return chips.slice(0, 4);
}

export function pickTechSpecValues(
  fields: ProductExtraFieldsMap,
  categorySlug: string | null | undefined,
): ProductExtraFieldsMap {
  const labels = getTechSpecLabels(categorySlug);
  const picked: ProductExtraFieldsMap = {};
  for (const label of labels) {
    picked[label] = fields[label] ?? "";
  }
  return picked;
}
