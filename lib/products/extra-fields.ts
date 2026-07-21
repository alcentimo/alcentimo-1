import {
  FOOD_MODIFIERS_METADATA_KEY,
  hasFoodModifiers,
  parseFoodModifiersJson,
} from "@/lib/rubros/modules/alimentos";

export type ProductExtraFieldsMap = Record<string, string>;

const METADATA_KEY = "extra_fields";

export function parseExtraFieldsJson(raw: string): {
  fields: ProductExtraFieldsMap;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "{}") {
    return { fields: {} };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { fields: {}, error: "Formato de campos extra no válido." };
    }

    const fields: ProductExtraFieldsMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        fields[key] = value.trim();
      }
    }
    return { fields };
  } catch {
    return { fields: {}, error: "Formato de campos extra no válido." };
  }
}

export function serializeExtraFieldsJson(fields: ProductExtraFieldsMap): string {
  return JSON.stringify(fields);
}

export function parseExtraFieldsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProductExtraFieldsMap {
  if (!metadata || typeof metadata !== "object") return {};
  const raw = metadata[METADATA_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const fields: ProductExtraFieldsMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      fields[key] = value;
    }
  }
  return fields;
}

export function buildProductMetadata(
  existing: Record<string, unknown> | null | undefined,
  extraFields: ProductExtraFieldsMap,
  allowedLabels: string[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

  const existingExtra = parseExtraFieldsFromMetadata(base);
  const sanitized: ProductExtraFieldsMap = { ...existingExtra };

  for (const label of allowedLabels) {
    const value = extraFields[label]?.trim();
    if (value) {
      sanitized[label] = value;
    } else {
      delete sanitized[label];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    delete base[METADATA_KEY];
  } else {
    base[METADATA_KEY] = sanitized;
  }

  return base;
}

/** Fusiona o limpia `food_modifiers` en metadata sin tocar otros keys. */
export function applyFoodModifiersToMetadata(
  metadata: Record<string, unknown>,
  foodModifiersJson: string | null | undefined,
): { metadata: Record<string, unknown>; error?: string } {
  if (foodModifiersJson == null) {
    return { metadata };
  }

  const parsed = parseFoodModifiersJson(foodModifiersJson);
  if (parsed.error) {
    return { metadata, error: parsed.error };
  }

  const next = { ...metadata };
  if (hasFoodModifiers(parsed.config)) {
    next[FOOD_MODIFIERS_METADATA_KEY] = parsed.config;
  } else {
    delete next[FOOD_MODIFIERS_METADATA_KEY];
  }

  return { metadata: next };
}

export function pickExtraFieldValues(
  fields: ProductExtraFieldsMap,
  labels: string[],
): ProductExtraFieldsMap {
  const picked: ProductExtraFieldsMap = {};
  for (const label of labels) {
    picked[label] = fields[label] ?? "";
  }
  return picked;
}
