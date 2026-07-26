import { getExtraFieldsForProductCategory, normalizeStoreRubro } from "@/src/config/categories";
import {
  filterExtraFieldsForActiveModule,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import { getTechSpecLabels } from "@/lib/rubros/modules/tecnologia/config";
import { getCollectibleFieldLabels } from "@/lib/rubros/modules/coleccionables/config";
import { getBeautyFieldLabels } from "@/lib/rubros/modules/salud-belleza/config";
import {
  getStationeryFieldLabels,
  STATIONERY_FIELD_UNITS_PER_PACK,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";

/** Etiquetas de campos dinámicos según rubro y categoría (cliente y servidor). */
export function resolveProductFieldLabels(
  rubro: string,
  categorySlug: string,
): string[] {
  if (storeUsesRubroProductModule(rubro, "tecnologia")) {
    return getTechSpecLabels(categorySlug);
  }
  if (storeUsesRubroProductModule(rubro, "coleccionables")) {
    return getCollectibleFieldLabels();
  }
  if (storeUsesRubroProductModule(rubro, "salud-belleza")) {
    return getBeautyFieldLabels();
  }
  if (storeUsesRubroProductModule(rubro, "papeleria-libreria-oficina")) {
    const labels = getStationeryFieldLabels(categorySlug);
    if (!labels.includes(STATIONERY_FIELD_UNITS_PER_PACK)) {
      labels.push(STATIONERY_FIELD_UNITS_PER_PACK);
    }
    return labels;
  }
  const normalized = normalizeStoreRubro(rubro);
  return filterExtraFieldsForActiveModule(
    normalized,
    getExtraFieldsForProductCategory(normalized, categorySlug),
  );
}
