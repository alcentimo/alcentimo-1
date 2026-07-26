import type { OnboardingSampleProductDraft } from "@/lib/ai/onboarding-assistant-types";
import type { ValidatedImportRow } from "@/lib/products/import-schema";

export function sampleProductsToImportRows(
  products: OnboardingSampleProductDraft[],
): ValidatedImportRow[] {
  return products.map((product, index) => ({
    rowNumber: index + 2,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: product.precio,
    stock: product.stock,
    url_imagen: null,
    categoria: product.categoria,
  }));
}
