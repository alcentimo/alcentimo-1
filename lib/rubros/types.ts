import type { StoreRubro } from "@/src/config/categories";

/**
 * Módulos de producto activos. Solo los listados aquí se cargan en runtime
 * (lazy) cuando la tienda tiene ese rubro. Añadir un rubro aquí no importa
 * su código; el import dinámico ocurre en el loader del módulo.
 */
export type RubroProductModuleId =
  | "ropa-moda"
  | "alimentos"
  | "tecnologia"
  | "coleccionables"
  | "salud-belleza";

/** Registro ligero: no importa componentes ni datos pesados. */
export const ACTIVE_RUBRO_PRODUCT_MODULES: Partial<
  Record<StoreRubro, RubroProductModuleId>
> = {
  "ropa-moda": "ropa-moda",
  alimentos: "alimentos",
  tecnologia: "tecnologia",
  coleccionables: "coleccionables",
  "salud-belleza": "salud-belleza",
};

/** Campos que el módulo de variantes/specs sustituye (no mostrar como texto libre genérico). */
export const RUBRO_MODULE_MANAGED_EXTRA_FIELDS: Record<
  RubroProductModuleId,
  readonly string[]
> = {
  "ropa-moda": ["Talla", "Color", "Material", "Género"],
  alimentos: [
    "Marca",
    "Peso/Volumen",
    "Presentación",
    "Volumen",
    "Sabor",
    "Origen",
  ],
  tecnologia: [
    "Almacenamiento",
    "Memoria RAM",
    "Color",
    "Compatibilidad",
    "Pantalla",
    "Modelo compatible",
    "Marca",
  ],
  coleccionables: [
    "Condición",
    "Edición / Rareza",
    "Preventa",
    "Llegada estimada",
  ],
  "salud-belleza": [
    "Presentación",
    "Volumen",
    "Tono",
    "Color",
    "Tipo de piel",
    "Ingredientes clave",
  ],
};

/** Si true, el formulario no muestra selector de categoría (el rubro define el giro). */
export const RUBRO_MODULE_HIDES_CATEGORY: Record<RubroProductModuleId, boolean> = {
  "ropa-moda": true,
  alimentos: false,
  tecnologia: false,
  coleccionables: false,
  "salud-belleza": false,
};
