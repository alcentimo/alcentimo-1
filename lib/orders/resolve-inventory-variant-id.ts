import { parseVariantsJson } from "@/lib/products/variants";

export interface ProductVariantRow {
  id: string;
  product_id: string;
  name: string;
  is_default: boolean;
}

/** Mapea el id de variante del catálogo al UUID real en product_variants. */
export function resolveOrderLineInventoryVariantId(options: {
  catalogVariantId: string;
  productId: string;
  productVariantsJson: unknown;
  dbVariants: ProductVariantRow[];
  defaultVariantId: string;
}): string | null {
  const {
    catalogVariantId,
    productId,
    productVariantsJson,
    dbVariants,
    defaultVariantId,
  } = options;

  const forProduct = dbVariants.filter((row) => row.product_id === productId);
  const trimmedCatalogId = catalogVariantId.trim();

  if (trimmedCatalogId) {
    const directMatch = forProduct.find((row) => row.id === trimmedCatalogId);
    if (directMatch) return directMatch.id;
  }

  const jsonVariants = parseVariantsJson(productVariantsJson);
  const jsonVariant = trimmedCatalogId
    ? jsonVariants.find((variant) => variant.id === trimmedCatalogId)
    : null;

  if (jsonVariant) {
    const byName = forProduct.find(
      (row) =>
        row.name.trim().toLowerCase() === jsonVariant.name.trim().toLowerCase(),
    );
    if (byName) return byName.id;
  }

  const defaultRow =
    forProduct.find((row) => row.id === defaultVariantId) ??
    forProduct.find((row) => row.is_default) ??
    forProduct[0];

  return defaultRow?.id ?? (defaultVariantId.trim() || null);
}

export function validateSubmitOrderLineInput(line: {
  productId?: string;
  variantId?: string;
  quantity?: number;
  productName?: string;
}): string | null {
  if (!line.productId?.trim()) {
    return "Un producto del carrito ya no está disponible. Actualiza el carrito e intenta de nuevo.";
  }
  if (!Number.isFinite(line.quantity) || (line.quantity ?? 0) <= 0) {
    return line.productName
      ? `La cantidad de "${line.productName}" no es válida.`
      : "Hay un producto con cantidad inválida en el carrito.";
  }
  return null;
}
