import { FOOD_MODIFIERS_METADATA_KEY } from "@/lib/rubros/modules/alimentos/config";

export interface FoodModifierOption {
  id: string;
  name: string;
  priceExtraUsd: number;
}

export interface FoodModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: FoodModifierOption[];
}

export interface FoodModifiersConfig {
  groups: FoodModifierGroup[];
}

export function emptyFoodModifiers(): FoodModifiersConfig {
  return { groups: [] };
}

export function createDefaultFoodModifiers(): FoodModifiersConfig {
  return {
    groups: [
      {
        id: crypto.randomUUID(),
        name: "Extras",
        required: false,
        min: 0,
        max: 3,
        options: [
          {
            id: crypto.randomUUID(),
            name: "Queso extra",
            priceExtraUsd: 0.5,
          },
          {
            id: crypto.randomUUID(),
            name: "Tocino",
            priceExtraUsd: 0.75,
          },
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "Preferencias",
        required: false,
        min: 0,
        max: 5,
        options: [
          {
            id: crypto.randomUUID(),
            name: "Sin cebolla",
            priceExtraUsd: 0,
          },
          {
            id: crypto.randomUUID(),
            name: "Término medio",
            priceExtraUsd: 0,
          },
        ],
      },
    ],
  };
}

function parseOption(raw: unknown): FoodModifierOption | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  const price =
    typeof row.priceExtraUsd === "number"
      ? row.priceExtraUsd
      : typeof row.price_extra_usd === "number"
        ? row.price_extra_usd
        : parseFloat(String(row.priceExtraUsd ?? row.price_extra_usd ?? 0)) || 0;

  return {
    id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
    name,
    priceExtraUsd: Number.isFinite(price) ? Math.max(0, price) : 0,
  };
}

function parseGroup(raw: unknown): FoodModifierGroup | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;

  const optionsRaw = Array.isArray(row.options) ? row.options : [];
  const options = optionsRaw
    .map(parseOption)
    .filter((option): option is FoodModifierOption => option != null);
  if (options.length === 0) return null;

  const maxRaw = Number(row.max);
  const minRaw = Number(row.min);
  const max = Number.isFinite(maxRaw) ? Math.max(1, Math.floor(maxRaw)) : options.length;
  const min = Number.isFinite(minRaw) ? Math.max(0, Math.floor(minRaw)) : 0;
  const required = row.required === true || min > 0;

  return {
    id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
    name,
    required,
    min: required ? Math.max(1, min) : min,
    max: Math.max(required ? 1 : 0, max),
    options,
  };
}

export function parseFoodModifiersConfig(
  raw: unknown,
): FoodModifiersConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyFoodModifiers();
  }
  const groupsRaw = (raw as Record<string, unknown>).groups;
  if (!Array.isArray(groupsRaw)) return emptyFoodModifiers();

  return {
    groups: groupsRaw
      .map(parseGroup)
      .filter((group): group is FoodModifierGroup => group != null),
  };
}

export function parseFoodModifiersFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): FoodModifiersConfig {
  if (!metadata || typeof metadata !== "object") return emptyFoodModifiers();
  return parseFoodModifiersConfig(metadata[FOOD_MODIFIERS_METADATA_KEY]);
}

export function parseFoodModifiersJson(raw: string): {
  config: FoodModifiersConfig;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "{}" || trimmed === '{"groups":[]}') {
    return { config: emptyFoodModifiers() };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return { config: parseFoodModifiersConfig(parsed) };
  } catch {
    return {
      config: emptyFoodModifiers(),
      error: "Formato de modificadores no válido.",
    };
  }
}

export function serializeFoodModifiersJson(
  config: FoodModifiersConfig,
): string {
  return JSON.stringify(config);
}

export function hasFoodModifiers(config: FoodModifiersConfig): boolean {
  return config.groups.some((group) => group.options.length > 0);
}
