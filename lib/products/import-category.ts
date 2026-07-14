import { slugify } from "@/lib/slugify";
import {
  getProductCategoriesForRubro,
  type StoreRubro,
} from "@/src/config/categories";
import { normalizeProductNameKey } from "@/lib/products/import-sanitize";

/** Resuelve el slug de categoría desde el valor de la columna `categoria`. */
export function resolveCategorySlugFromImport(
  rubro: StoreRubro,
  categoriaValue: string,
): string | null {
  const trimmed = categoriaValue.trim();
  if (!trimmed) return null;

  const options = getProductCategoriesForRubro(rubro);
  const slugCandidate = slugify(trimmed) || trimmed.toLowerCase();

  const bySlug = options.find((option) => option.slug === slugCandidate);
  if (bySlug) return bySlug.slug;

  const normalizedLabel = trimmed.toLocaleLowerCase("es");
  const byLabel = options.find(
    (option) => option.label.toLocaleLowerCase("es") === normalizedLabel,
  );
  if (byLabel) return byLabel.slug;

  return null;
}

export function formatCategoryHints(rubro: StoreRubro): string {
  const options = getProductCategoriesForRubro(rubro);
  return options.map((option) => `${option.slug} (${option.label})`).join(", ");
}

export function findDuplicateImportNames(
  rows: { nombre: string; rowNumber: number }[],
): string[] {
  const seen = new Map<string, number>();
  const errors: string[] = [];

  for (const row of rows) {
    const key = normalizeProductNameKey(row.nombre);
    const previousRow = seen.get(key);
    if (previousRow !== undefined) {
      errors.push(
        `Fila ${row.rowNumber}: nombre duplicado con la fila ${previousRow} ("${row.nombre}").`,
      );
      continue;
    }
    seen.set(key, row.rowNumber);
  }

  return errors;
}
