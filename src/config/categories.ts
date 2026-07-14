/**
 * Configuración adaptativa por rubro de tienda.
 * Para añadir un rubro nuevo (ej. "Venta de Cauchos"), agrega una entrada aquí
 * con `nombre` igual al slug de la categoría de la tienda (slugify del nombre).
 */

export interface StoreCategoryConfig {
  /** Identificador en slug (ej. `tecnologia`, `venta-de-cauchos`). */
  nombre: string;
  /** Etiqueta legible mostrada en la UI. */
  label: string;
  /** Campos extra que el formulario de producto renderiza automáticamente. */
  campos: string[];
}

export const STORE_CATEGORY_CONFIGS: StoreCategoryConfig[] = [
  {
    nombre: "ropa",
    label: "Ropa",
    campos: ["Talla", "Color", "Material", "Género"],
  },
  {
    nombre: "comida",
    label: "Comida",
    campos: ["Peso / Presentación", "Fecha de vencimiento", "Ingredientes"],
  },
  {
    nombre: "tecnologia",
    label: "Tecnología",
    campos: ["Memoria RAM", "Almacenamiento", "Color"],
  },
  {
    nombre: "servicios",
    label: "Servicios",
    campos: ["Duración", "Modalidad", "Incluye"],
  },
  // Ejemplo para rubros personalizados (onboarding → "Otros"):
  // {
  //   nombre: "venta-de-cauchos",
  //   label: "Venta de Cauchos",
  //   campos: ["Medida", "Índice de velocidad", "Marca"],
  // },
];

const CONFIG_BY_NOMBRE = new Map(
  STORE_CATEGORY_CONFIGS.map((config) => [config.nombre, config]),
);

export function getCategoryConfigByNombre(
  nombre: string,
): StoreCategoryConfig | undefined {
  return CONFIG_BY_NOMBRE.get(nombre.trim().toLowerCase());
}

export function getExtraFieldsForCategoryNombre(nombre: string): string[] {
  return getCategoryConfigByNombre(nombre)?.campos ?? [];
}

export function getCategoryLabelForNombre(nombre: string): string | null {
  return getCategoryConfigByNombre(nombre)?.label ?? null;
}
