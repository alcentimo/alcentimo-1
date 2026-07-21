/**
 * Punto de extensión para módulos de rubro oficiales.
 *
 * Cómo añadir un rubro:
 * 1. Añadir opción en `STORE_RUBRO_OPTIONS` (`src/config/categories.ts`).
 * 2. Crear `lib/rubros/modules/<id>/` con config + helpers.
 * 3. Crear UI lazy en `components/rubros/<id>/`.
 * 4. Registrar en `ACTIVE_RUBRO_PRODUCT_MODULES` (`lib/rubros/types.ts`).
 * 5. Añadir case en `loadRubroProductModule` y wrappers de sección.
 *
 * Módulos activos: ropa-moda, alimentos, tecnologia, coleccionables, salud-belleza.
 * El registro es liviano: no importa React ni datos pesados de otros rubros.
 */
export {
  getActiveProductModuleId,
  storeUsesRubroProductModule,
  rubroHidesProductCategory,
  filterExtraFieldsForActiveModule,
  loadRubroProductModule,
} from "@/lib/rubros/registry";

export type { RubroProductModuleId } from "@/lib/rubros/types";
