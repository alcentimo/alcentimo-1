import type { StoreRubro } from "@/src/config/categories";
import {
  TECH_CATEGORY_KEYWORDS,
  TECH_CATEGORY_PRIORITY,
} from "@/lib/products/tech-category-keywords";
import {
  ROPA_MODA_CATEGORY_KEYWORDS,
  ROPA_MODA_CATEGORY_PRIORITY,
} from "@/lib/products/rubro-category-keywords/ropa-moda";
import {
  ALIMENTOS_CATEGORY_KEYWORDS,
  ALIMENTOS_CATEGORY_PRIORITY,
} from "@/lib/products/rubro-category-keywords/alimentos";
import {
  COLECCIONABLES_CATEGORY_KEYWORDS,
  COLECCIONABLES_CATEGORY_PRIORITY,
} from "@/lib/products/rubro-category-keywords/coleccionables";
import {
  SALUD_BELLEZA_CATEGORY_KEYWORDS,
  SALUD_BELLEZA_CATEGORY_PRIORITY,
} from "@/lib/products/rubro-category-keywords/salud-belleza";
import {
  PAPELERIA_CATEGORY_KEYWORDS,
  PAPELERIA_CATEGORY_PRIORITY,
} from "@/lib/products/rubro-category-keywords/papeleria-libreria-oficina";

export type RubroKeywordMap = Record<string, string[]>;

export const RUBRO_CATEGORY_KEYWORDS: Record<StoreRubro, RubroKeywordMap> = {
  tecnologia: TECH_CATEGORY_KEYWORDS,
  "ropa-moda": ROPA_MODA_CATEGORY_KEYWORDS,
  alimentos: ALIMENTOS_CATEGORY_KEYWORDS,
  coleccionables: COLECCIONABLES_CATEGORY_KEYWORDS,
  "salud-belleza": SALUD_BELLEZA_CATEGORY_KEYWORDS,
  "papeleria-libreria-oficina": PAPELERIA_CATEGORY_KEYWORDS,
};

export const RUBRO_CATEGORY_PRIORITY: Partial<
  Record<StoreRubro, Record<string, number>>
> = {
  tecnologia: TECH_CATEGORY_PRIORITY,
  "ropa-moda": ROPA_MODA_CATEGORY_PRIORITY,
  alimentos: ALIMENTOS_CATEGORY_PRIORITY,
  coleccionables: COLECCIONABLES_CATEGORY_PRIORITY,
  "salud-belleza": SALUD_BELLEZA_CATEGORY_PRIORITY,
  "papeleria-libreria-oficina": PAPELERIA_CATEGORY_PRIORITY,
};

export function getRubroCategoryKeywords(rubro: StoreRubro): RubroKeywordMap {
  return RUBRO_CATEGORY_KEYWORDS[rubro] ?? {};
}

export function getRubroCategoryPriority(
  rubro: StoreRubro,
): Record<string, number> | undefined {
  return RUBRO_CATEGORY_PRIORITY[rubro];
}
