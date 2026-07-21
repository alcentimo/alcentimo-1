/**
 * Punto de extensión para futuros módulos de rubro.
 *
 * Cómo añadir un rubro (ej. ferretería):
 * 1. Crear `lib/rubros/modules/ferreteria/` con config + helpers.
 * 2. Crear UI lazy en `components/rubros/ferreteria/`.
 * 3. Registrar en `ACTIVE_RUBRO_PRODUCT_MODULES` (`lib/rubros/types.ts`).
 * 4. Añadir case en `loadRubroProductModule` y en los wrappers
 *    `RubroVariantsSection` / `RubroCatalogVariantSlot` /
 *    `RubroModifiersSection` / `RubroTechSpecsSection` / `RubroCollectibleSection`.
 *
 * Módulos activos: ropa-moda, alimentos, tecnologia, coleccionables.
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
