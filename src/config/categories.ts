/**
 * Configuración de rubro de tienda y categorías de producto adaptativas.
 * Para añadir rubros o categorías, edita solo este archivo.
 */

export const STORE_RUBRO_OPTIONS = [
  { value: "ropa", label: "Ropa" },
  { value: "zapateria", label: "Zapatería" },
  { value: "joyeria", label: "Joyería" },
  { value: "cosmeticos", label: "Cosméticos" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "repuestos", label: "Repuestos" },
  { value: "general", label: "General" },
] as const;

export type StoreRubro = (typeof STORE_RUBRO_OPTIONS)[number]["value"];

export interface ProductCategoryOption {
  slug: string;
  label: string;
  campos: string[];
}

export interface StoreRubroConfig {
  rubro: StoreRubro;
  label: string;
  categorias: ProductCategoryOption[];
}

export const STORE_RUBRO_CONFIGS: StoreRubroConfig[] = [
  {
    rubro: "ropa",
    label: "Ropa",
    categorias: [
      { slug: "camisas", label: "Camisas", campos: ["Talla", "Color", "Material"] },
      { slug: "pantalones", label: "Pantalones", campos: ["Talla", "Color", "Material"] },
      { slug: "chaquetas", label: "Chaquetas", campos: ["Talla", "Color", "Material"] },
      { slug: "accesorios", label: "Accesorios", campos: ["Color", "Material", "Género"] },
    ],
  },
  {
    rubro: "zapateria",
    label: "Zapatería",
    categorias: [
      { slug: "zapatos", label: "Zapatos", campos: ["Talla", "Color", "Material"] },
      { slug: "botas", label: "Botas", campos: ["Talla", "Color", "Material"] },
      { slug: "sandalias", label: "Sandalias", campos: ["Talla", "Color"] },
      { slug: "accesorios", label: "Accesorios", campos: ["Color", "Material"] },
    ],
  },
  {
    rubro: "joyeria",
    label: "Joyería",
    categorias: [
      { slug: "anillos", label: "Anillos", campos: ["Material", "Talla", "Piedra"] },
      { slug: "collares", label: "Collares", campos: ["Material", "Longitud", "Piedra"] },
      { slug: "pulseras", label: "Pulseras", campos: ["Material", "Talla"] },
      { slug: "accesorios", label: "Accesorios", campos: ["Material", "Color"] },
    ],
  },
  {
    rubro: "cosmeticos",
    label: "Cosméticos",
    categorias: [
      { slug: "maquillaje", label: "Maquillaje", campos: ["Tono", "Tipo de piel", "Presentación"] },
      { slug: "cuidado-facial", label: "Cuidado facial", campos: ["Tipo de piel", "Presentación"] },
      { slug: "cuidado-capilar", label: "Cuidado capilar", campos: ["Tipo de cabello", "Presentación"] },
      { slug: "fragancias", label: "Fragancias", campos: ["Familia olfativa", "Presentación"] },
    ],
  },
  {
    rubro: "tecnologia",
    label: "Tecnología",
    categorias: [
      { slug: "celulares", label: "Celulares", campos: ["Memoria RAM", "Almacenamiento", "Color"] },
      { slug: "laptops", label: "Laptops", campos: ["Memoria RAM", "Almacenamiento", "Pantalla"] },
      { slug: "accesorios", label: "Accesorios", campos: ["Compatibilidad", "Color"] },
      { slug: "repuestos", label: "Repuestos", campos: ["Modelo compatible", "Marca"] },
    ],
  },
  {
    rubro: "repuestos",
    label: "Repuestos",
    categorias: [
      { slug: "motor", label: "Motor", campos: ["Marca", "Modelo compatible", "Año"] },
      { slug: "carroceria", label: "Carrocería", campos: ["Marca", "Modelo compatible"] },
      { slug: "electricidad", label: "Electricidad", campos: ["Marca", "Modelo compatible", "Voltaje"] },
      { slug: "accesorios", label: "Accesorios", campos: ["Marca", "Compatibilidad"] },
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

const CONFIG_BY_RUBRO = new Map(
  STORE_RUBRO_CONFIGS.map((config) => [config.rubro, config]),
);

export const DEFAULT_STORE_RUBRO: StoreRubro = "general";

export function isValidStoreRubro(value: string): value is StoreRubro {
  return RUBRO_SET.has(value.trim().toLowerCase());
}

export function normalizeStoreRubro(value: string | null | undefined): StoreRubro {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isValidStoreRubro(trimmed) ? trimmed : DEFAULT_STORE_RUBRO;
}

export function getRubroLabel(rubro: StoreRubro): string {
  return STORE_RUBRO_OPTIONS.find((item) => item.value === rubro)?.label ?? rubro;
}

export function getProductCategoriesForRubro(rubro: StoreRubro): ProductCategoryOption[] {
  return CONFIG_BY_RUBRO.get(rubro)?.categorias ?? CONFIG_BY_RUBRO.get(DEFAULT_STORE_RUBRO)!.categorias;
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
