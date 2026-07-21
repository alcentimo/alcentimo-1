import {
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import {
  ACTIVE_RUBRO_PRODUCT_MODULES,
  RUBRO_MODULE_HIDES_CATEGORY,
  RUBRO_MODULE_MANAGED_EXTRA_FIELDS,
  type RubroProductModuleId,
} from "@/lib/rubros/types";

export function getActiveProductModuleId(
  rubro: string | null | undefined,
): RubroProductModuleId | null {
  const normalized = normalizeStoreRubro(rubro);
  return ACTIVE_RUBRO_PRODUCT_MODULES[normalized] ?? null;
}

export function storeUsesRubroProductModule(
  rubro: string | null | undefined,
  moduleId: RubroProductModuleId,
): boolean {
  return getActiveProductModuleId(rubro) === moduleId;
}

export function rubroHidesProductCategory(
  rubro: string | null | undefined,
): boolean {
  const moduleId = getActiveProductModuleId(rubro);
  return moduleId ? RUBRO_MODULE_HIDES_CATEGORY[moduleId] === true : false;
}

/**
 * Quita campos libres que el módulo activo gestiona (p. ej. Talla/Color en moda).
 * Seguro llamar siempre: si no hay módulo, devuelve los campos sin cambios.
 */
export function filterExtraFieldsForActiveModule(
  rubro: StoreRubro | string | null | undefined,
  campos: string[],
): string[] {
  const moduleId = getActiveProductModuleId(rubro);
  if (!moduleId) return campos;

  const managed = new Set(RUBRO_MODULE_MANAGED_EXTRA_FIELDS[moduleId]);
  return campos.filter((campo) => !managed.has(campo));
}

/**
 * Carga diferida del módulo de producto. Solo importa el chunk del rubro activo.
 * Futuros rubros: añadir case + archivo en modules/<id>.
 */
export async function loadRubroProductModule(moduleId: RubroProductModuleId) {
  switch (moduleId) {
    case "ropa-moda":
      return import("@/lib/rubros/modules/ropa-moda");
    case "alimentos":
      return import("@/lib/rubros/modules/alimentos");
    default: {
      const _exhaustive: never = moduleId;
      return _exhaustive;
    }
  }
}
