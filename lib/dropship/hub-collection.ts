export const HUB_COLLECTION_CARRIER = "acopio_alcentimo";
export const HUB_COLLECTION_BUYER_NAME = "Recolección Alcéntimo";
export const HUB_COLLECTION_NOTES =
  "Aparta este stock. Alcéntimo recogerá el producto en el centro de acopio. No incluye datos de pago del cliente final.";

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
