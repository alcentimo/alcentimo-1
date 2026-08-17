import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";

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

function formatCarrier(value: string | null): string {
  return value?.trim() || "—";
}

export function buildDispatchOrderText(details: DispatchOrderDetails): string {
  const productLines =
    details.items.length > 0
      ? details.items.map(
          (item) => `• ${item.quantity}× ${item.productTitle}`,
        )
      : ["• (sin líneas)"];

  const lines = [
    `Nueva orden de despacho D+1 #${details.orderCode}`,
    `Prepara el envío para el ${formatBusinessDateEs(details.shipOn)}.`,
    "",
    "📦 Productos:",
    ...productLines,
    "",
    "👤 Cliente final:",
    `Nombre: ${details.customerName}`,
    `Teléfono: ${details.customerPhone?.trim() || "—"}`,
    `Dirección: ${details.customerAddress?.trim() || "—"}`,
  ];

  if (
    details.shippingCarrier ||
    details.shippingBranchName ||
    details.shippingBranchAddress
  ) {
    lines.push(
      "",
      "🚚 Agencia:",
      `Método: ${formatCarrier(details.shippingCarrier)}`,
      `Sucursal: ${formatCarrier(details.shippingBranchName)}`,
    );
    if (details.shippingBranchAddress?.trim()) {
      lines.push(`Dir. agencia: ${details.shippingBranchAddress.trim()}`);
    }
  }

  lines.push(
    "",
    "🏷️ Etiqueta de despacho (remitente visible):",
    `Remitente: ${details.senderName}`,
    "Destinatario: el cliente final de arriba.",
    "No uses el nombre de tu empresa ni datos del mayorista en el paquete.",
  );

  if (details.dashboardUrl?.trim()) {
    lines.push("", `Ver en el panel: ${details.dashboardUrl.trim()}`);
  }

  return lines.join("\n");
}
