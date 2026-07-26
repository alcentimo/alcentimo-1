import type { StoreRubro } from "@/src/config/categories";
import { normalizeStoreRubro } from "@/src/config/categories";
import { resolveProductFieldLabels } from "@/lib/products/resolve-product-field-labels";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { TECH_SPEC_PRESETS } from "@/lib/rubros/modules/tecnologia/config";
import { BEAUTY_VOLUME_PRESETS, BEAUTY_TONE_PRESETS } from "@/lib/rubros/modules/salud-belleza/config";
import {
  STATIONERY_FORMAT_OPTIONS,
  STATIONERY_COLOR_OPTIONS,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";
import { COLLECTIBLE_EDITION_OPTIONS } from "@/lib/rubros/modules/coleccionables/config";

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

/** Palabras clave por rubro → slug de categoría sugerida. */
const CATEGORY_KEYWORDS: Partial<Record<StoreRubro, Record<string, string[]>>> = {
  tecnologia: {
    celulares: [
      "iphone",
      "samsung galaxy",
      "smartphone",
      "celular",
      "móvil",
      "movil",
      "android",
      "redmi",
      "xiaomi",
      "honor",
      "motorola",
      "poco",
    ],
    laptops: [
      "laptop",
      "notebook",
      "macbook",
      "portátil",
      "portatil",
      "ultrabook",
      "thinkpad",
      "vivobook",
    ],
    tablets: ["tablet", "ipad", "tab s", "galaxy tab"],
    audio: [
      "audífono",
      "audifono",
      "auricular",
      "headphone",
      "earbud",
      "airpods",
      "parlante",
      "speaker",
      "bocina",
      "soundbar",
    ],
    accesorios: [
      "cargador",
      "cable usb",
      "funda",
      "case",
      "protector",
      "mouse",
      "teclado",
      "keyboard",
      "webcam",
    ],
    repuestos: ["repuesto", "pantalla lcd", "batería", "bateria", "flex", "pin de carga"],
    procesadores: ["procesador", "cpu", "ryzen", "core i3", "core i5", "core i7", "core i9"],
    "tarjetas-madre": ["tarjeta madre", "motherboard", "placa madre", "mainboard"],
    "memorias-ram": ["memoria ram", "ram ddr", "ddr4", "ddr5", "sodimm"],
    "almacenamiento-pc": ["ssd", "nvme", "disco duro", "hdd", "m.2"],
    "tarjetas-graficas": ["tarjeta gráfica", "tarjeta grafica", "gpu", "rtx", "gtx", "radeon"],
    "fuentes-poder": ["fuente de poder", "psu", "power supply"],
    gabinetes: ["gabinete", "case pc", "tower"],
  },
  "ropa-moda": {
    camisas: ["camisa", "camiseta", "polo", "blusa", "t-shirt", "tshirt"],
    pantalones: ["pantalón", "pantalon", "jean", "jogger", "short", "bermuda"],
    calzado: ["calzado", "zapato", "bota", "sandalia", "sneaker", "tenis"],
    zapatos: ["zapato", "mocasín", "mocasin", "oxford"],
    botas: ["bota", "botín", "botin"],
    sandalias: ["sandalia", "chancleta"],
    deportivos: ["deportivo", "running", "training", "air max"],
    accesorios: ["cinturón", "cinturon", "gorra", "bufanda", "cartera", "bolso"],
  },
  alimentos: {
    entradas: ["entrada", "aperitivo", "ensalada", "sopa"],
    "platos-principales": [
      "plato principal",
      "arepa",
      "pasta",
      "hamburguesa",
      "pollo",
      "carne",
      "pizza",
      "bowl",
    ],
    bebidas: ["bebida", "jugo", "refresco", "café", "cafe", "té", "te", "smoothie"],
    postres: ["postre", "torta", "helado", "brownie", "dulce", "pastel"],
  },
  coleccionables: {
    comics: ["cómic", "comic", "manga", "graphic novel"],
    figuras: ["figura", "funko", "action figure", "statue", "nendoroid"],
    cartas: ["carta", "tcg", "pokémon", "pokemon", "yugioh", "magic the gathering"],
    merch: ["merch", "poster", "playera", "sudadera", "pin"],
  },
  "salud-belleza": {
    "cuidado-personal": ["sérum", "serum", "crema", "hidratante", "protector solar", "spf"],
    maquillaje: ["labial", "rubor", "base", "mascara", "máscara", "delineador", "sombras"],
    fragancias: ["perfume", "fragancia", "colonia", "eau de"],
    suplementos: ["suplemento", "vitamina", "proteína", "proteina", "omega", "colágeno"],
    cabello: ["shampoo", "champú", "acondicionador", "tinte", "tratamiento capilar"],
  },
  "papeleria-libreria-oficina": {
    cuadernos: ["cuaderno", "libreta", "agenda"],
    "utiles-escolares": ["lápiz", "lapiz", "bolígrafo", "boligrafo", "marcador", "regla", "goma"],
    papeleria: ["papel", "cartulina", "sobre", "folder", "archivador"],
    "material-oficina": ["grapa", "perforadora", "clips", "cinta adhesiva", "calculadora"],
    impresion: ["tinta", "toner", "cartucho", "resma"],
    libros: ["libro", "novela", "manual", "texto escolar"],
  },
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreCategoryFromTitle(
  title: string,
  categories: ProductCategoryCandidate[],
  keywordMap: Record<string, string[]>,
): { slug: string; label: string; score: number } | null {
  const normalizedTitle = normalizeText(title);
  let best: { slug: string; label: string; score: number } | null = null;

  for (const category of categories) {
    let score = 0;
    const labelNorm = normalizeText(category.label);
    if (labelNorm.length >= 3 && normalizedTitle.includes(labelNorm)) {
      score += 4;
    }
    const slugPhrase = category.slug.replace(/-/g, " ");
    if (slugPhrase.length >= 3 && normalizedTitle.includes(slugPhrase)) {
      score += 3;
    }

    const keywords = keywordMap[category.slug] ?? [];
    for (const keyword of keywords) {
      const kw = normalizeText(keyword);
      if (kw.length >= 2 && normalizedTitle.includes(kw)) {
        score += kw.length >= 6 ? 3 : 2;
      }
    }

    if (!best || score > best.score) {
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
  setIfEmpty("Presentación", pickPresetValue(title, BEAUTY_VOLUME_PRESETS));
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
  const keywordMap = CATEGORY_KEYWORDS[normalizedRubro] ?? {};
  const match = scoreCategoryFromTitle(trimmed, categories, keywordMap);
  const fallback = categories[0] ?? null;

  const categorySlug = match?.slug ?? fallback?.slug ?? null;
  const categoryLabel = match?.label ?? fallback?.label ?? null;
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
