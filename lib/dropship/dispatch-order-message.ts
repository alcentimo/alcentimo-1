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
  shippingCarrier: string | null;
  shippingBranchName: string | null;
  shippingBranchAddress: string | null;
  items: DispatchOrderLine[];
  dashboardUrl?: string | null;
};

/**
 * Aviso al proveedor del centro de acopio: solo productos a apartar.
 * Sin datos de pago ni PII del cliente final.
 */
export function buildDispatchOrderText(details: DispatchOrderDetails): string {
  const productLines =
    details.items.length > 0
      ? details.items.map(
          (item) => `• ${item.quantity}× ${item.productTitle}`,
        )
      : ["• (sin líneas)"];

  const lines = [
    `Alcéntimo · Apartar stock #${details.orderCode}`,
    "El dropshipper ya aprobó el pago de su cliente. Aparta estos productos y espera la recolección de Alcéntimo.",
    "",
    "📦 Productos a apartar:",
    ...productLines,
    "",
    "No hace falta despachar al cliente final ni revisar su comprobante de pago.",
    "Alcéntimo recogerá el paquete en el centro de acopio y lo enviará.",
  ];

  if (details.dashboardUrl?.trim()) {
    lines.push("", `Ver en el panel: ${details.dashboardUrl.trim()}`);
  }

  return lines.join("\n");
}
