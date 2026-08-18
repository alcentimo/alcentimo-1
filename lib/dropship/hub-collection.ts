export const HUB_COLLECTION_CARRIER = "acopio_alcentimo";
export const HUB_COLLECTION_BUYER_NAME = "Recolección Alcéntimo";
export const HUB_COLLECTION_NOTES =
  "Aparta este stock. Alcéntimo recogerá el producto. No incluye el comprobante de pago del cliente final. Usa los datos de destino para etiquetar el paquete.";

export function isHubCollectionCarrier(
  shippingCarrier: string | null | undefined,
): boolean {
  return shippingCarrier === HUB_COLLECTION_CARRIER;
}

export function isHubCollectionSupplierOrder(order: {
  sourceCatalogOrderId?: string | null;
  shippingCarrier?: string | null;
}): boolean {
  return (
    Boolean(order.sourceCatalogOrderId?.trim()) ||
    isHubCollectionCarrier(order.shippingCarrier)
  );
}

export function hubOrderHasPackingDestination(order: {
  buyerName?: string | null;
  buyerDocumentId?: string | null;
  buyerPhone?: string | null;
  buyerAddress?: string | null;
  shippingBranchName?: string | null;
}): boolean {
  const name = order.buyerName?.trim() ?? "";
  if (name && name !== HUB_COLLECTION_BUYER_NAME) return true;
  return Boolean(
    order.buyerDocumentId?.trim() ||
      order.buyerPhone?.trim() ||
      order.buyerAddress?.trim() ||
      order.shippingBranchName?.trim(),
  );
}
