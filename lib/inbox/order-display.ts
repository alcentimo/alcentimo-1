import type { VentaWithProduct } from "@/lib/sales/types";

export function formatOrderReference(sale: VentaWithProduct): string {
  const reference = sale.external_reference?.trim();
  if (reference) return reference.startsWith("#") ? reference : `#${reference}`;

  return `#${sale.id.slice(0, 8).toUpperCase()}`;
}

export function formatOrderStatus(sale: VentaWithProduct): string {
  const payment = sale.metodo_pago?.trim();
  if (payment) {
    const normalized = payment.replace(/_/g, " ");
    return `Completado · ${normalized}`;
  }

  return "Completado";
}

export function getOrderStatusTone(): string {
  return "inbox-order-status";
}
