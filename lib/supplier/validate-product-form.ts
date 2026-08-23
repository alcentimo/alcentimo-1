import {
  resolveSupplierProductStock,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";

export const SUPPLIER_PRODUCT_PHOTO_REQUIRED_ERROR =
  "Sube al menos una foto principal del producto. No se puede guardar sin imagen.";

export const SUPPLIER_PRODUCT_STOCK_REQUIRED_ERROR =
  "El stock debe ser mayor a 0. No se puede guardar un producto agotado o con todas las variantes en 0.";

export function parseSupplierGeneralStock(raw: string): number | null {
  const stockRaw = raw.trim();
  if (!stockRaw) return null;
  const stock = Number(stockRaw);
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
    return null;
  }
  return stock;
}

export function countSupplierFormGalleryItems(input: {
  galleryItemCount: number;
  existingImageCount?: number;
}): number {
  if (input.galleryItemCount > 0) return input.galleryItemCount;
  return Math.max(0, input.existingImageCount ?? 0);
}

export function validateSupplierProductForm(input: {
  title: string;
  stock: string;
  galleryItemCount: number;
  existingImageCount?: number;
  galleryBusy?: boolean;
  variants: SupplierProductVariants;
}): string | null {
  if (input.galleryBusy) {
    return "Espera a que terminen de procesarse las fotos.";
  }

  const photoCount = countSupplierFormGalleryItems({
    galleryItemCount: input.galleryItemCount,
    existingImageCount: input.existingImageCount,
  });
  if (photoCount <= 0) {
    return SUPPLIER_PRODUCT_PHOTO_REQUIRED_ERROR;
  }

  const title = input.title.trim();
  if (title.length < 2) {
    return "Indica un título de al menos 2 caracteres.";
  }

  const generalStock = parseSupplierGeneralStock(input.stock);
  if (generalStock == null) {
    return "El stock debe ser un número entero ≥ 0.";
  }

  const resolved = resolveSupplierProductStock(input.variants, generalStock);
  if (resolved.stock <= 0) {
    return SUPPLIER_PRODUCT_STOCK_REQUIRED_ERROR;
  }

  return null;
}
