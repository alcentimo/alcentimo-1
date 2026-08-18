export type DispatchOrderLine = {
  productTitle: string;
  quantity: number;
};

export type DispatchOrderDetails = {
  orderCode: string;
  senderName: string;
  shipOn: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  customerDocumentId?: string | null;
  shippingCarrier: string | null;
  shippingBranchName: string | null;
  shippingBranchAddress: string | null;
  items: DispatchOrderLine[];
  dashboardUrl?: string | null;
};

/**
 * Aviso al proveedor: productos a apartar y etiqueta de destino.
 * Sin comprobante de pago del cliente final.
 */
export function buildDispatchOrderText(details: DispatchOrderDetails): string {
  const productLines =
    details.items.length > 0
      ? details.items.map(
          (item) => `• ${item.quantity}× ${item.productTitle}`,
        )
      : ["• (sin líneas)"];

  const destinationBits = [
    details.customerName,
    details.customerDocumentId ? `CI ${details.customerDocumentId}` : null,
    details.customerPhone,
    details.customerAddress,
    details.shippingBranchName,
  ].filter(Boolean);

  const lines = [
    `Alcéntimo · Apartar stock #${details.orderCode}`,
    "El dropshipper ya liquidó a Alcéntimo. Aparta estos productos y etiqueta el paquete con el destino del comprador.",
    "",
    "📦 Productos a apartar:",
    ...productLines,
    "",
    "🏷️ Destino del paquete:",
    destinationBits.length > 0
      ? destinationBits.map((bit) => `• ${bit}`).join("\n")
      : "• Sin destino registrado",
    "",
    "No revises el comprobante de pago del cliente final.",
    "Alcéntimo recogerá el paquete en el centro de acopio.",
  ];

  if (details.dashboardUrl?.trim()) {
    lines.push("", `Ver en el panel: ${details.dashboardUrl.trim()}`);
  }

  return lines.join("\n");
}
