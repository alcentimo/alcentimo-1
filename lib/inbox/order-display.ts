import type { VentaWithProduct } from "@/lib/sales/types";

export function formatOrderReference(sale: VentaWithProduct): string {
  const reference = sale.external_reference?.trim();
  if (reference) return reference.startsWith("#") ? reference : `#${reference}`;

  return `#${sale.id.slice(0, 8).toUpperCase()}`;
}
