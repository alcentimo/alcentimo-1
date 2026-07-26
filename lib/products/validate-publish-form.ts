import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";

export interface ValidateProductPublishInput {
  name: string;
  priceUsd: string;
  galleryItemCount: number;
  galleryBusy?: boolean;
  showCategorySelector?: boolean;
  categorySlug?: string;
  customCategoryName?: string;
  wholesalePriceUsd?: string;
  wholesaleMinQty?: string;
}

/** Validación cliente antes de publicar; devuelve mensaje de error o null si OK. */
export function validateProductPublishInput(
  input: ValidateProductPublishInput,
): string | null {
  if (input.galleryBusy) {
    return "Espera a que terminen de procesarse las fotos.";
  }

  const name = input.name.trim();
  if (!name) {
    return "El nombre del producto es obligatorio.";
  }

  const usd = parseFloat(input.priceUsd);
  if (!Number.isFinite(usd) || usd <= 0) {
    return "Ingresa un precio válido en dólares.";
  }

  if (input.galleryItemCount <= 0) {
    return "Agrega al menos una foto del producto.";
  }

  if (
    input.showCategorySelector &&
    input.categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE
  ) {
    if (!input.customCategoryName?.trim()) {
      return "Escribe el nombre de la categoría personalizada.";
    }
  }

  const wholesalePrice = input.wholesalePriceUsd?.trim() ?? "";
  const wholesaleMin = input.wholesaleMinQty?.trim() ?? "";
  const hasWholesalePrice = wholesalePrice.length > 0;
  const hasWholesaleMin = wholesaleMin.length > 0;

  if (hasWholesalePrice || hasWholesaleMin) {
    if (!hasWholesalePrice || !hasWholesaleMin) {
      return "Completa precio mayorista y cantidad mínima, o deja ambos vacíos.";
    }
    const wp = parseFloat(wholesalePrice);
    const mq = parseInt(wholesaleMin, 10);
    if (!Number.isFinite(wp) || wp <= 0) {
      return "Ingresa un precio mayorista válido.";
    }
    if (!Number.isFinite(mq) || mq < 2) {
      return "La cantidad mínima mayorista debe ser 2 o más.";
    }
    if (wp >= usd) {
      return "El precio mayorista debe ser menor al precio de detal.";
    }
  }

  return null;
}
