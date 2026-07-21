/**
 * Rubro de tienda y categorías sugeridas por giro del negocio.
 * Edita este archivo para añadir rubros, categorías o campos adaptativos.
 */

export const STORE_RUBRO_OPTIONS = [
  { value: "ferreteria", label: "Ferretería" },
  { value: "ropa-moda", label: "Ropa y Moda" },
  { value: "calzado", label: "Calzado" },
  { value: "tecnologia", label: "Tecnología y Electrónica" },
  { value: "alimentos", label: "Alimentos y Bebidas" },
  { value: "salud-belleza", label: "Salud y Belleza" },
  { value: "hogar-decoracion", label: "Hogar y Decoración" },
  { value: "general", label: "General" },
] as const;

export type StoreRubro = (typeof STORE_RUBRO_OPTIONS)[number]["value"];

export interface ProductCategoryOption {
  slug: string;
  label: string;
  campos: string[];
  isCustom?: boolean;
}

export interface StoreRubroConfig {
  rubro: StoreRubro;
  label: string;
  categorias: ProductCategoryOption[];
}

export const STORE_RUBRO_CONFIGS: StoreRubroConfig[] = [
  {
    rubro: "ferreteria",
    label: "Ferretería",
    categorias: [
      { slug: "herramientas", label: "Herramientas", campos: ["Marca", "Material", "Medida"] },
      { slug: "fijacion", label: "Fijación", campos: ["Material", "Medida", "Presentación"] },
      { slug: "electricidad", label: "Electricidad", campos: ["Marca", "Voltaje", "Compatibilidad"] },
      { slug: "plomeria", label: "Plomería", campos: ["Material", "Medida", "Marca"] },
    ],
  },
  {
    rubro: "ropa-moda",
    label: "Ropa y Moda",
    categorias: [
      { slug: "camisas", label: "Camisas", campos: [] },
      { slug: "pantalones", label: "Pantalones", campos: [] },
      { slug: "calzado", label: "Calzado", campos: [] },
      { slug: "accesorios", label: "Accesorios", campos: [] },
    ],
  },
  {
    rubro: "calzado",
    label: "Calzado",
    categorias: [
      { slug: "zapatos", label: "Zapatos", campos: ["Talla", "Color", "Material"] },
      { slug: "botas", label: "Botas", campos: ["Talla", "Color", "Material"] },
      { slug: "sandalias", label: "Sandalias", campos: ["Talla", "Color"] },
      { slug: "deportivos", label: "Deportivos", campos: ["Talla", "Color", "Material"] },
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
    rubro: "salud-belleza",
    label: "Salud y Belleza",
    categorias: [
      { slug: "cuidado-personal", label: "Cuidado personal", campos: ["Tipo de piel", "Presentación"] },
      { slug: "maquillaje", label: "Maquillaje", campos: ["Tono", "Tipo de piel", "Presentación"] },
      { slug: "fragancias", label: "Fragancias", campos: ["Familia olfativa", "Presentación"] },
      { slug: "suplementos", label: "Suplementos", campos: ["Presentación", "Contenido"] },
    ],
  },
  {
    rubro: "hogar-decoracion",
    label: "Hogar y Decoración",
    categorias: [
      { slug: "muebles", label: "Muebles", campos: ["Material", "Color", "Medidas"] },
      { slug: "decoracion", label: "Decoración", campos: ["Material", "Color", "Estilo"] },
      { slug: "cocina", label: "Cocina", campos: ["Material", "Capacidad", "Color"] },
      { slug: "textiles", label: "Textiles", campos: ["Material", "Medidas", "Color"] },
    ],
  },
  {
    rubro: "general",
    label: "General",
    categorias: [
      { slug: "general", label: "General", campos: [] },
      { slug: "novedades", label: "Novedades", campos: [] },
      { slug: "ofertas", label: "Ofertas", campos: [] },
    ],
  },
];

const RUBRO_SET = new Set<string>(STORE_RUBRO_OPTIONS.map((item) => item.value));

const LEGACY_RUBRO_ALIASES: Record<string, StoreRubro> = {
  ropa: "ropa-moda",
  zapateria: "calzado",
  joyeria: "salud-belleza",
  cosmeticos: "salud-belleza",
  repuestos: "ferreteria",
};

const CONFIG_BY_RUBRO = new Map(
  STORE_RUBRO_CONFIGS.map((config) => [config.rubro, config]),
);

export const DEFAULT_STORE_RUBRO: StoreRubro = "general";

export function isValidStoreRubro(value: string): value is StoreRubro {
  return RUBRO_SET.has(value.trim().toLowerCase());
}

export function normalizeStoreRubro(value: string | null | undefined): StoreRubro {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (LEGACY_RUBRO_ALIASES[trimmed]) {
    return LEGACY_RUBRO_ALIASES[trimmed];
  }
  return isValidStoreRubro(trimmed) ? trimmed : DEFAULT_STORE_RUBRO;
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
