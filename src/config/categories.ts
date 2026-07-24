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
    categorias: [
      { slug: "camisas", label: "Camisas", campos: [] },
      { slug: "pantalones", label: "Pantalones", campos: [] },
      { slug: "calzado", label: "Calzado", campos: [] },
      { slug: "zapatos", label: "Zapatos", campos: [] },
      { slug: "botas", label: "Botas", campos: [] },
      { slug: "sandalias", label: "Sandalias", campos: [] },
      { slug: "deportivos", label: "Deportivos", campos: [] },
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
};

const CONFIG_BY_RUBRO = new Map(
  STORE_RUBRO_CONFIGS.map((config) => [config.rubro, config]),
);

export const DEFAULT_STORE_RUBRO: StoreRubro = "ropa-moda";

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
