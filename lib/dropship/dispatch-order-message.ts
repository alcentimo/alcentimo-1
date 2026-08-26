export type DispatchOrderLine = {
  productTitle: string;
  quantity: number;
};

export type DispatchOrderDetails = {
  orderCode: string;
  shipOn: string;
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

  const lines = [
    `Alcéntimo · Pedido mayorista #${details.orderCode}`,
    "Alcéntimo te compró estos productos. Apártalos. El despacho se habilita cuando Alcéntimo registre el pago en tu panel; entonces márcalos listos para recolección.",
    "",
    "📦 Productos a apartar:",
    ...productLines,
    "",
    "🚚 Retiro:",
    details.shipOn
      ? `Alcéntimo pasará a retirar la mercancía a partir del ${details.shipOn} y se encargará de despacharla a los clientes.`
      : "Alcéntimo pasará a retirar la mercancía en tu almacén y se encargará de despacharla a los clientes.",
    "",
    "No despaches ni cobres al cliente. Alcéntimo te paga y retira.",
  ];

  if (details.dashboardUrl?.trim()) {
    lines.push("", `Ver en el panel: ${details.dashboardUrl.trim()}`);
  }

  return lines.join("\n");
}
