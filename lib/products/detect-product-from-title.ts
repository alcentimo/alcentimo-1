import { normalizeStoreRubro } from "@/src/config/categories";
import { resolveProductFieldLabels } from "@/lib/products/resolve-product-field-labels";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { BEAUTY_VOLUME_PRESETS, BEAUTY_TONE_PRESETS } from "@/lib/rubros/modules/salud-belleza/config";
import {
  STATIONERY_FORMAT_OPTIONS,
  STATIONERY_COLOR_OPTIONS,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";
import { COLLECTIBLE_EDITION_OPTIONS } from "@/lib/rubros/modules/coleccionables/config";
import { TECH_SPEC_PRESETS } from "@/lib/rubros/modules/tecnologia/config";
import {
  getRubroCategoryKeywords,
  getRubroCategoryPriority,
} from "@/lib/products/rubro-category-keywords";

export interface ProductCategoryCandidate {
  slug: string;
  label: string;
}

export interface DetectProductFromTitleResult {
  categorySlug: string | null;
  categoryLabel: string | null;
  confidence: number;
  extraFields: ProductExtraFieldsMap;
  source: "rules" | "none";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Evita falsos positivos con tokens cortos (p. ej. «pc» dentro de otras palabras). */
function titleIncludesKeyword(normalizedTitle: string, keyword: string): boolean {
  const kw = normalizeText(keyword);
  if (!kw) return false;

  if (kw.includes(" ")) {
    return normalizedTitle.includes(kw);
  }

  if (kw.length <= 4) {
    return new RegExp(`\\b${escapeRegex(kw)}\\b`, "i").test(normalizedTitle);
  }

  return normalizedTitle.includes(kw);
}

function categoryPriority(slug: string, priorityMap?: Record<string, number>): number {
  return priorityMap?.[slug] ?? 50;
}

function scoreCategoryFromTitle(
  title: string,
  categories: ProductCategoryCandidate[],
  keywordMap: Record<string, string[]>,
  priorityMap?: Record<string, number>,
): { slug: string; label: string; score: number } | null {
  const normalizedTitle = normalizeText(title);
  let best: { slug: string; label: string; score: number } | null = null;

  for (const category of categories) {
    let score = 0;
    const labelNorm = normalizeText(category.label);
    if (labelNorm.length >= 3 && titleIncludesKeyword(normalizedTitle, labelNorm)) {
      score += 4;
    }
    const slugPhrase = category.slug.replace(/-/g, " ");
    if (slugPhrase.length >= 3 && titleIncludesKeyword(normalizedTitle, slugPhrase)) {
      score += 3;
    }

    const keywords = keywordMap[category.slug] ?? [];
    for (const keyword of keywords) {
      const kw = normalizeText(keyword);
      if (titleIncludesKeyword(normalizedTitle, kw)) {
        score += kw.length >= 6 || kw.includes(" ") ? 3 : 2;
      }
    }

    if (
      !best ||
      score > best.score ||
      (score === best.score &&
        score > 0 &&
        categoryPriority(category.slug, priorityMap) <
          categoryPriority(best.slug, priorityMap))
    ) {
      best = { slug: category.slug, label: category.label, score };
    }
  }

  return best && best.score >= 2 ? best : null;
}

function pickPresetValue(
  title: string,
  presets: readonly string[],
): string | null {
  const normalizedTitle = normalizeText(title);
  for (const preset of presets) {
    if (normalizedTitle.includes(normalizeText(preset))) {
      return preset;
    }
  }
  return null;
}

function extractStorage(title: string): string | null {
  const match = title.match(/\b(\d+)\s*(tb|gb)\b/i);
  if (!match) return null;
  return `${match[1]} ${match[2].toUpperCase()}`;
}

function extractRam(title: string): string | null {
  const match = title.match(/\b(\d+)\s*gb\s*(ram|ddr\d)?\b/i);
  if (!match) return null;
  const value = `${match[1]} GB`;
  const presets = TECH_SPEC_PRESETS["Memoria RAM"];
  return presets.includes(value as (typeof presets)[number]) ? value : value;
}

function extractScreen(title: string): string | null {
  const match = title.match(/\b(\d+(?:\.\d+)?)\s*(?:pulgadas|"|inch)\b/i);
  if (!match) return null;
  return `${match[1]}"`;
}

function extractBeautyVolume(title: string): string | null {
  const match = title.match(/\b(\d+)\s*(ml|g|gr|gramos?)\b/i);
  if (!match) return null;
  const unit = match[2].toLowerCase().startsWith("g") ? "g" : "ml";
  const value = `${match[1]} ${unit}`;
  return BEAUTY_VOLUME_PRESETS.includes(value as (typeof BEAUTY_VOLUME_PRESETS)[number])
    ? value
    : value;
}

function extractSpecsFromTitle(
  title: string,
  fieldLabels: string[],
): ProductExtraFieldsMap {
  const specs: ProductExtraFieldsMap = {};
  const setIfEmpty = (label: string, value: string | null | undefined) => {
    if (value?.trim() && fieldLabels.includes(label)) {
      specs[label] = value.trim();
    }
  };

  setIfEmpty("Almacenamiento", extractStorage(title));
  setIfEmpty("Capacidad", extractStorage(title));
  setIfEmpty("Memoria RAM", extractRam(title));
  setIfEmpty("Pantalla", extractScreen(title));
  setIfEmpty(
    "Color",
    pickPresetValue(title, TECH_SPEC_PRESETS.Color) ??
      pickPresetValue(title, STATIONERY_COLOR_OPTIONS),
  );
  setIfEmpty(
    "Presentación",
    extractBeautyVolume(title) ?? pickPresetValue(title, BEAUTY_VOLUME_PRESETS),
  );
  setIfEmpty("Tono", pickPresetValue(title, BEAUTY_TONE_PRESETS));
  setIfEmpty("Formato / Tamaño", pickPresetValue(title, STATIONERY_FORMAT_OPTIONS));
  setIfEmpty(
    "Edición / Rareza",
    pickPresetValue(title, COLLECTIBLE_EDITION_OPTIONS),
  );

  if (fieldLabels.includes("Compatibilidad")) {
    const compat = pickPresetValue(title, TECH_SPEC_PRESETS.Compatibilidad);
    setIfEmpty("Compatibilidad", compat);
  }

  if (/\b(usb-c|usbc|type c)\b/i.test(title)) {
    setIfEmpty("Compatibilidad", "USB-C");
  }
  if (/\blightning\b/i.test(title)) {
    setIfEmpty("Compatibilidad", "Lightning");
  }

  if (/\b(chase|exclusive|limitada|edición limitada)\b/i.test(title)) {
    setIfEmpty("Edición / Rareza", "Chase");
  }

  if (/\b(nuevo|sellado)\b/i.test(title)) {
    setIfEmpty("Condición", "Nuevo / Sellado de fábrica");
  }

  const vramMatch = title.match(/\b(\d+)\s*gb\s*vram\b/i);
  if (vramMatch) {
    setIfEmpty("VRAM", `${vramMatch[1]} GB`);
  }

  const wattMatch = title.match(/\b(\d{3,4})\s*w(?:att?s?)?\b/i);
  if (wattMatch) {
    setIfEmpty("Potencia", `${wattMatch[1]}W`);
  }

  const socketMatch = title.match(/\b(am4|am5|lga\s*1700|lga\s*1200)\b/i);
  if (socketMatch) {
    setIfEmpty("Socket", socketMatch[1].replace(/\s+/g, " ").toUpperCase());
  }

  if (/\bnvme\b/i.test(title)) {
    setIfEmpty("Interfaz", "NVMe");
    setIfEmpty("Tipo", "NVMe SSD");
  }

  return specs;
}

export function mergeDetectedExtraFields(
  current: ProductExtraFieldsMap,
  detected: ProductExtraFieldsMap,
  labels: string[],
): ProductExtraFieldsMap {
  const merged: ProductExtraFieldsMap = { ...current };
  for (const label of labels) {
    if (!merged[label]?.trim() && detected[label]?.trim()) {
      merged[label] = detected[label].trim();
    }
  }
  return merged;
}

/** Detección rápida por reglas (sin IA). Segura en cliente y servidor. */
export function detectProductFromTitle(
  title: string,
  rubro: string,
  categories: ProductCategoryCandidate[],
): DetectProductFromTitleResult {
  const trimmed = title.trim();
  if (trimmed.length < 3 || categories.length === 0) {
    return {
      categorySlug: null,
      categoryLabel: null,
      confidence: 0,
      extraFields: {},
      source: "none",
    };
  }

  const normalizedRubro = normalizeStoreRubro(rubro);
  const keywordMap = getRubroCategoryKeywords(normalizedRubro);
  const priorityMap = getRubroCategoryPriority(normalizedRubro);
  const match = scoreCategoryFromTitle(
    trimmed,
    categories,
    keywordMap,
    priorityMap,
  );

  const categorySlug = match?.slug ?? null;
  const categoryLabel = match?.label ?? null;
  const confidence = match?.score ?? 0;

  const fieldLabels = categorySlug
    ? resolveProductFieldLabels(normalizedRubro, categorySlug)
    : [];

  return {
    categorySlug,
    categoryLabel,
    confidence,
    extraFields: extractSpecsFromTitle(trimmed, fieldLabels),
    source: match ? "rules" : "none",
  };
}
