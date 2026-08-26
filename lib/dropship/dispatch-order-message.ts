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
 * Aviso al proveedor: Alcéntimo compra y retira; el proveedor solo aparta stock.
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
    `Alcéntimo · Pedido mayorista #${details.orderCode}`,
    "Alcéntimo te compró estos productos. Apártalos. El despacho se habilita cuando Alcéntimo registre el pago en tu panel; entonces márcalos listos para recolección.",
    "",
    "📦 Productos a apartar:",
    ...productLines,
    "",
    "🏷️ Referencia para retiro Alcéntimo:",
    destinationBits.length > 0
      ? destinationBits.map((bit) => `• ${bit}`).join("\n")
      : "• Sin destino registrado",
    "",
    "No despaches ni cobres al cliente. Alcéntimo te paga y retira.",
  ];

  if (details.dashboardUrl?.trim()) {
    lines.push("", `Ver en el panel: ${details.dashboardUrl.trim()}`);
  }

  return lines.join("\n");
}
