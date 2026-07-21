import type { StoreRubro } from "@/src/config/categories";

/**
 * Módulos de producto activos. Solo los listados aquí se cargan en runtime
 * (lazy) cuando la tienda tiene ese rubro. Añadir un rubro aquí no importa
 * su código; el import dinámico ocurre en el loader del módulo.
 */
export type RubroProductModuleId = "ropa-moda";

/** Registro ligero: no importa componentes ni datos pesados. */
export const ACTIVE_RUBRO_PRODUCT_MODULES: Partial<
  Record<StoreRubro, RubroProductModuleId>
> = {
  "ropa-moda": "ropa-moda",
};

/** Campos que el módulo de variantes sustituye (no mostrar como texto libre). */
export const RUBRO_MODULE_MANAGED_EXTRA_FIELDS: Record<
  RubroProductModuleId,
  readonly string[]
> = {
  "ropa-moda": ["Talla", "Color", "Material", "Género"],
};

/** Si true, el formulario no muestra selector de categoría (el rubro define el giro). */
export const RUBRO_MODULE_HIDES_CATEGORY: Record<RubroProductModuleId, boolean> = {
  "ropa-moda": true,
};
