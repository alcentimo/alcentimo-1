import type { VariantFormInput } from "@/lib/products/variants";
import {
  BEAUTY_ATTR_PRESENTACION,
  BEAUTY_ATTR_TONO,
  BEAUTY_VOLUME_PRESETS,
  type BeautyVariantMode,
} from "@/lib/rubros/modules/salud-belleza/config";

export function beautyOptionKey(value: string): string {
  return value.trim().toLowerCase();
}

export function getBeautyVariantLabel(
  variant: VariantFormInput,
): { mode: BeautyVariantMode; label: string } | null {
  const presentacion = variant.attributes?.[BEAUTY_ATTR_PRESENTACION]?.trim();
  if (presentacion) return { mode: "presentacion", label: presentacion };

  const tono = variant.attributes?.[BEAUTY_ATTR_TONO]?.trim();
  if (tono) return { mode: "tono", label: tono };

  const name = variant.name.trim();
  if (!name) return null;

  // Heurística: si parece volumen (ml/g), tratar como presentación.
  if (/\b\d+(\.\d+)?\s*(ml|g|oz)\b/i.test(name)) {
    return { mode: "presentacion", label: name };
  }
  return { mode: "tono", label: name };
}

export function detectBeautyVariantMode(
  variants: VariantFormInput[],
): BeautyVariantMode {
  for (const variant of variants) {
    const parsed = getBeautyVariantLabel(variant);
    if (parsed) return parsed.mode;
  }
  return "presentacion";
}

export interface BeautyVariantsState {
  mode: BeautyVariantMode;
  options: string[];
  stocks: Record<string, string>;
  priceExtras: Record<string, string>;
  ids: Record<string, string | undefined>;
}

export function emptyBeautyVariants(
  mode: BeautyVariantMode = "presentacion",
): BeautyVariantsState {
  return { mode, options: [], stocks: {}, priceExtras: {}, ids: {} };
}

export function createDefaultBeautyVariants(
  mode: BeautyVariantMode = "presentacion",
): BeautyVariantsState {
  const options =
    mode === "presentacion"
      ? [BEAUTY_VOLUME_PRESETS[1], BEAUTY_VOLUME_PRESETS[2], BEAUTY_VOLUME_PRESETS[3]]
      : ["Nude", "Rosa", "Rojo"];
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};

  for (const option of options) {
    const key = beautyOptionKey(option);
    stocks[key] = "0";
    priceExtras[key] = "0";
  }

  return { mode, options: [...options], stocks, priceExtras, ids: {} };
}

export function variantsToBeautyState(
  variants: VariantFormInput[],
): BeautyVariantsState {
  const mode = detectBeautyVariantMode(variants);
  const options: string[] = [];
  const seen = new Set<string>();
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};
  const ids: Record<string, string | undefined> = {};

  for (const variant of variants) {
    const parsed = getBeautyVariantLabel(variant);
    if (!parsed || parsed.mode !== mode) continue;
    const key = beautyOptionKey(parsed.label);
    if (!seen.has(key)) {
      seen.add(key);
      options.push(parsed.label);
    }
    stocks[key] = variant.stock;
    priceExtras[key] = variant.priceExtraUsd || "0";
    ids[key] = variant.id;
  }

  return { mode, options, stocks, priceExtras, ids };
}

export function beautyStateToVariants(
  state: BeautyVariantsState,
): VariantFormInput[] {
  const attrKey =
    state.mode === "presentacion" ? BEAUTY_ATTR_PRESENTACION : BEAUTY_ATTR_TONO;

  return state.options
    .map((option) => {
      const key = beautyOptionKey(option);
      const label = option.trim();
      return {
        id: state.ids[key],
        name: label,
        stock: state.stocks[key] ?? "0",
        priceExtraUsd: state.priceExtras[key] ?? "0",
        attributes: { [attrKey]: label },
      } satisfies VariantFormInput;
    })
    .filter((row) => row.name.length > 0);
}
