import { slugify } from "@/lib/slugify";

/**
 * Rubro de tienda y categorías sugeridas por giro del negocio.
 * Rubros oficiales operativos (módulos de producto activos).
 */

export const STORE_RUBRO_OPTIONS = [
  { value: "ropa-moda", label: "Ropa, Calzado y Moda" },
  { value: "alimentos", label: "Alimentos y Bebidas" },
  { value: "tecnologia", label: "Tecnología y Electrónica" },
  { value: "coleccionables", label: "Coleccionables y Cómics" },
  { value: "salud-belleza", label: "Salud, Belleza y Cuidado Personal" },
  {
    value: "papeleria-libreria-oficina",
    label: "Papelería, Librería y Oficina",
  },
] as const;

export type StoreRubro = (typeof STORE_RUBRO_OPTIONS)[number]["value"];

export interface ProductCategoryOption {
  slug: string;
  label: string;
  campos: string[];
  isCustom?: boolean;
  /** Categoría preset de un rubro anterior (productos existentes pueden usarla). */
  isLegacy?: boolean;
}

export interface StoreRubroConfig {
  rubro: StoreRubro;
  label: string;
  categorias: ProductCategoryOption[];
}

export const STORE_RUBRO_CONFIGS: StoreRubroConfig[] = [
  {
    rubro: "ropa-moda",
    label: "Ropa, Calzado y Moda",
    /** Template inicial al registrar o cambiar rubro (sin duplicar slugs existentes). */
    categorias: [
      { slug: "damas", label: "Damas", campos: [] },
      { slug: "caballeros", label: "Caballeros", campos: [] },
      { slug: "ninos", label: "Niños", campos: [] },
      { slug: "unisex", label: "Unisex", campos: [] },
      { slug: "camisas", label: "Camisas", campos: [] },
      { slug: "pantalones", label: "Pantalones", campos: [] },
      { slug: "calzado", label: "Calzado", campos: [] },
      { slug: "accesorios", label: "Accesorios", campos: [] },
    ],
  },
  {
    rubro: "alimentos",
    label: "Alimentos y Bebidas",
    categorias: [
      { slug: "entradas", label: "Entradas", campos: [] },
      { slug: "platos-principales", label: "Platos Principales", campos: [] },
      { slug: "bebidas", label: "Bebidas", campos: [] },
      { slug: "postres", label: "Postres", campos: [] },
    ],
  },
  {
    rubro: "tecnologia",
    label: "Tecnología y Electrónica",
    categorias: [
      { slug: "celulares", label: "Celulares", campos: [] },
      { slug: "laptops", label: "Laptops", campos: [] },
      { slug: "tablets", label: "Tablets", campos: [] },
      { slug: "audio", label: "Audio", campos: [] },
      { slug: "accesorios", label: "Accesorios", campos: [] },
      { slug: "repuestos", label: "Repuestos", campos: [] },
      { slug: "procesadores", label: "Procesadores", campos: [] },
      { slug: "tarjetas-madre", label: "Tarjetas madre", campos: [] },
      { slug: "memorias-ram", label: "Memorias RAM", campos: [] },
      { slug: "almacenamiento-pc", label: "Almacenamiento PC", campos: [] },
      { slug: "tarjetas-graficas", label: "Tarjetas gráficas", campos: [] },
      { slug: "fuentes-poder", label: "Fuentes de poder", campos: [] },
      { slug: "gabinetes", label: "Gabinetes", campos: [] },
    ],
  },
  {
    rubro: "coleccionables",
    label: "Coleccionables y Cómics",
    categorias: [
      { slug: "comics", label: "Cómics", campos: [] },
      { slug: "figuras", label: "Figuras", campos: [] },
      { slug: "cartas", label: "Cartas", campos: [] },
      { slug: "merch", label: "Merch", campos: [] },
      { slug: "otros", label: "Otros", campos: [] },
    ],
  },
  {
    rubro: "salud-belleza",
    label: "Salud, Belleza y Cuidado Personal",
    categorias: [
      { slug: "cuidado-personal", label: "Cuidado personal", campos: [] },
      { slug: "maquillaje", label: "Maquillaje", campos: [] },
      { slug: "fragancias", label: "Fragancias", campos: [] },
      { slug: "suplementos", label: "Suplementos", campos: [] },
      { slug: "cabello", label: "Cabello", campos: [] },
    ],
  },
  {
    rubro: "papeleria-libreria-oficina",
    label: "Papelería, Librería y Oficina",
    categorias: [
      { slug: "cuadernos", label: "Cuadernos", campos: [] },
      { slug: "utiles-escolares", label: "Útiles escolares", campos: [] },
      { slug: "papeleria", label: "Papelería", campos: [] },
      { slug: "material-oficina", label: "Material de oficina", campos: [] },
      { slug: "impresion", label: "Impresión", campos: [] },
      { slug: "libros", label: "Libros", campos: [] },
    ],
  },
];

const RUBRO_SET = new Set<string>(STORE_RUBRO_OPTIONS.map((item) => item.value));

/**
 * Valores antiguos en BD / onboarding legacy → rubro oficial.
 * No aparecen en el selector; `normalizeStoreRubro` los resuelve.
 */
const LEGACY_RUBRO_ALIASES: Record<string, StoreRubro> = {
  ropa: "ropa-moda",
  calzado: "ropa-moda",
  zapateria: "ropa-moda",
  ferreteria: "tecnologia",
  repuestos: "tecnologia",
  joyeria: "coleccionables",
  cosmeticos: "salud-belleza",
  papeleria: "papeleria-libreria-oficina",
  libreria: "papeleria-libreria-oficina",
  oficina: "papeleria-libreria-oficina",
  "hogar-decoracion": "ropa-moda",
  general: "ropa-moda",
  // Etiquetas / variantes que a veces llegan en lugar del slug.
  "ropa-calzado-y-moda": "ropa-moda",
  "ropa, calzado y moda": "ropa-moda",
  "alimentos-y-bebidas": "alimentos",
  "alimentos y bebidas": "alimentos",
  "tecnologia-y-electronica": "tecnologia",
  "tecnología y electrónica": "tecnologia",
  "tecnologia y electronica": "tecnologia",
  "coleccionables-y-comics": "coleccionables",
  "coleccionables y cómics": "coleccionables",
  "coleccionables y comics": "coleccionables",
  "salud-belleza-y-cuidado-personal": "salud-belleza",
  "salud, belleza y cuidado personal": "salud-belleza",
  "papeleria-libreria-y-oficina": "papeleria-libreria-oficina",
  "papelería, librería y oficina": "papeleria-libreria-oficina",
};

/**
 * Presets de rubros retirados del producto. Ya no están en STORE_RUBRO_CONFIGS,
 * así que sin esta denylist se tratan como “custom” y contaminan cualquier rubro.
 */
export const LEGACY_REMOVED_CATEGORY_PRESET_SLUGS = [
  // hogar-decoracion (retirado → alias ropa-moda)
  "muebles",
  "decoracion",
  "cocina",
  "textiles",
  "hogar",
  "iluminacion",
  // ferreteria (retirado → alias tecnologia)
  "herramientas",
  "fijacion",
  "electricidad",
  "plomeria",
  "pintura",
  "seguridad-industrial",
  // joyeria legacy (ahora coleccionables; slugs típicos residuales)
  "anillos",
  "collares",
  "pulseras",
  "aretes",
  "relojes",
  "joyas",
] as const;

const LEGACY_REMOVED_PRESET_SET = new Set<string>(
  LEGACY_REMOVED_CATEGORY_PRESET_SLUGS,
);

const CONFIG_BY_RUBRO = new Map(
  STORE_RUBRO_CONFIGS.map((config) => [config.rubro, config]),
);

export const DEFAULT_STORE_RUBRO: StoreRubro = "ropa-moda";

export function isValidStoreRubro(value: string): value is StoreRubro {
  return RUBRO_SET.has(value.trim().toLowerCase());
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeStoreRubro(value: string | null | undefined): StoreRubro {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return DEFAULT_STORE_RUBRO;

  if (LEGACY_RUBRO_ALIASES[trimmed]) {
    return LEGACY_RUBRO_ALIASES[trimmed];
  }

  const ascii = stripDiacritics(trimmed);
  if (LEGACY_RUBRO_ALIASES[ascii]) {
    return LEGACY_RUBRO_ALIASES[ascii];
  }

  if (isValidStoreRubro(trimmed)) return trimmed;

  // Match por label oficial (“Tecnología y Electrónica” → tecnologia).
  for (const option of STORE_RUBRO_OPTIONS) {
    const label = option.label.toLowerCase();
    if (label === trimmed || stripDiacritics(label) === ascii) {
      return option.value;
    }
  }

  const slugified = slugify(trimmed);
  if (slugified && isValidStoreRubro(slugified)) return slugified;
  if (slugified && LEGACY_RUBRO_ALIASES[slugified]) {
    return LEGACY_RUBRO_ALIASES[slugified];
  }

  return DEFAULT_STORE_RUBRO;
}

export function getRubroLabel(rubro: StoreRubro): string {
  return STORE_RUBRO_OPTIONS.find((item) => item.value === rubro)?.label ?? rubro;
}

export function getProductCategoriesForRubro(rubro: StoreRubro): ProductCategoryOption[] {
  return (
    CONFIG_BY_RUBRO.get(rubro)?.categorias ??
    CONFIG_BY_RUBRO.get(DEFAULT_STORE_RUBRO)!.categorias
  );
}

/**
 * Categorías iniciales a inyectar en Supabase para un rubro.
 * Misma fuente que el selector de productos / presets de UI.
 */
export function getInitialCategoriesForRubro(
  rubro: StoreRubro | string | null | undefined,
): ReadonlyArray<Pick<ProductCategoryOption, "slug" | "label">> {
  return getProductCategoriesForRubro(normalizeStoreRubro(rubro)).map(
    ({ slug, label }) => ({ slug, label }),
  );
}

/**
 * Presets de otros rubros que NO pertenecen al rubro actual.
 * Respeta slugs compartidos (p. ej. "accesorios" en moda y tecnología).
 * Incluye presets de rubros retirados (muebles, herramientas, anillos…).
 */
export function getOtherRubroExclusivePresetSlugs(rubro: StoreRubro): Set<string> {
  const currentSlugs = new Set(
    getProductCategoriesForRubro(rubro).map((category) => category.slug),
  );
  const exclusive = new Set<string>();

  for (const config of STORE_RUBRO_CONFIGS) {
    if (config.rubro === rubro) continue;
    for (const category of config.categorias) {
      if (!currentSlugs.has(category.slug)) {
        exclusive.add(category.slug);
      }
    }
  }

  for (const slug of LEGACY_REMOVED_PRESET_SET) {
    if (!currentSlugs.has(slug)) {
      exclusive.add(slug);
    }
  }

  return exclusive;
}

const GENERIC_CATEGORY_NAMES = new Set([
  "general",
  "otros",
  "varios",
  "sin categoria",
  "sin categoría",
  "uncategorized",
  "default",
  "demo",
  "prueba",
  "test",
]);

/** Slugs de preset definidos en cualquier rubro oficial o retirado. */
export function getAllRubroPresetSlugs(): Set<string> {
  const slugs = new Set<string>(LEGACY_REMOVED_PRESET_SET);
  for (const config of STORE_RUBRO_CONFIGS) {
    for (const category of config.categorias) {
      slugs.add(category.slug);
    }
  }
  return slugs;
}

function normalizeCategoryToken(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isGenericCategoryToken(value: string): boolean {
  return GENERIC_CATEGORY_NAMES.has(value);
}

function isLegacyRemovedPresetSlug(slug: string): boolean {
  return LEGACY_REMOVED_PRESET_SET.has(slug);
}

/** ¿La categoría es válida para mostrar en el catálogo público de este rubro? */
export function isCategoryVisibleForRubro(
  categorySlug: string | null | undefined,
  rubro: StoreRubro,
): boolean {
  const slug = normalizeCategoryToken(categorySlug);
  if (!slug || isGenericCategoryToken(slug)) return false;
  if (isLegacyRemovedPresetSlug(slug)) return false;
  return !getOtherRubroExclusivePresetSlugs(rubro).has(slug);
}

/**
 * ¿La categoría encaja con el rubro actual?
 * - Presets del rubro actual: sí
 * - Presets de otros rubros (activos o retirados): no
 * - Custom: solo si no replica slug/nombre de otro preset histórico
 */
export function isCategoryAlignedWithRubro(
  categorySlug: string | null | undefined,
  categoryName: string | null | undefined,
  rubro: StoreRubro,
): boolean {
  const slug = normalizeCategoryToken(categorySlug);
  const name = normalizeCategoryToken(categoryName);
  if (!slug) return false;
  if (isGenericCategoryToken(slug) || isGenericCategoryToken(name)) return false;
  if (isLegacyRemovedPresetSlug(slug)) return false;
  if (!isCategoryVisibleForRubro(slug, rubro)) return false;

  const currentPresets = getProductCategoriesForRubro(rubro);
  if (currentPresets.some((preset) => preset.slug === slug)) return true;

  for (const config of STORE_RUBRO_CONFIGS) {
    if (config.rubro === rubro) continue;
    for (const preset of config.categorias) {
      if (preset.slug === slug) return false;
      if (name && preset.label.toLowerCase() === name) return false;
      if (name && stripDiacritics(preset.label.toLowerCase()) === stripDiacritics(name)) {
        return false;
      }
    }
  }

  // Custom residual con nombre de preset retirado (p. ej. “Muebles”).
  for (const removedSlug of LEGACY_REMOVED_PRESET_SET) {
    if (name === removedSlug || name.replace(/\s+/g, "-") === removedSlug) {
      return false;
    }
  }

  return true;
}

/** Resuelve nombre de categoría de importación al preset del rubro o a custom válido. */
export function resolveImportCategoryForRubro(
  rubro: StoreRubro,
  rawName: string,
): { slug: string; label: string; isCustom: boolean } {
  const trimmed = rawName.trim();
  const normalized = normalizeCategoryToken(trimmed);
  const currentPresets = getProductCategoriesForRubro(rubro);
  const fallback = currentPresets[0] ?? {
    slug: "general",
    label: "General",
    campos: [],
  };

  if (!normalized || isGenericCategoryToken(normalized)) {
    return { slug: fallback.slug, label: fallback.label, isCustom: false };
  }

  for (const preset of currentPresets) {
    if (
      preset.slug === normalized ||
      preset.label.toLowerCase() === normalized
    ) {
      return { slug: preset.slug, label: preset.label, isCustom: false };
    }
  }

  for (const config of STORE_RUBRO_CONFIGS) {
    if (config.rubro === rubro) continue;
    for (const preset of config.categorias) {
      if (
        preset.slug === normalized ||
        preset.label.toLowerCase() === normalized
      ) {
        return { slug: fallback.slug, label: fallback.label, isCustom: false };
      }
    }
  }

  const customSlug = slugify(trimmed) || normalized;
  return { slug: customSlug, label: trimmed, isCustom: true };
}

/**
 * Etiqueta pública de categoría según rubro.
 * Oculta presets de otros rubros; usa el label oficial del rubro actual si existe.
 */
export function resolvePublicCategoryLabel(
  categorySlug: string | null | undefined,
  categoryName: string | null | undefined,
  rubro: StoreRubro,
): string | null {
  const slug = categorySlug?.trim().toLowerCase() ?? "";
  const name = categoryName?.trim() ?? "";
  if (!slug || !name) return null;
  if (!isCategoryAlignedWithRubro(slug, name, rubro)) return null;

  const preset = findProductCategoryOption(rubro, slug);
  return preset?.label ?? name;
}

export function findProductCategoryOption(
  rubro: StoreRubro,
  categorySlug: string,
): ProductCategoryOption | undefined {
  const slug = categorySlug.trim().toLowerCase();
  return getProductCategoriesForRubro(rubro).find((item) => item.slug === slug);
}

export function getExtraFieldsForProductCategory(
  rubro: StoreRubro,
  categorySlug: string,
): string[] {
  return findProductCategoryOption(rubro, categorySlug)?.campos ?? [];
}

/** @deprecated Usar rubro_tienda + categoría de producto. */
export function getCategoryConfigByNombre(nombre: string) {
  const rubro = normalizeStoreRubro(nombre);
  const config = CONFIG_BY_RUBRO.get(rubro);
  if (!config) return undefined;
  return {
    nombre: config.rubro,
    label: config.label,
    campos: config.categorias.flatMap((item) => item.campos),
  };
}

/** @deprecated */
export function getExtraFieldsForCategoryNombre(nombre: string): string[] {
  return getCategoryConfigByNombre(nombre)?.campos ?? [];
}

/** @deprecated */
export function getCategoryLabelForNombre(nombre: string): string | null {
  return getCategoryConfigByNombre(nombre)?.label ?? null;
}
