"use client";

import { useMemo } from "react";
import { Banknote, ShieldCheck } from "lucide-react";
import { catalogOrderHasDropshipLines } from "@/lib/dropship/catalog-order-dropship";
import { DROPSHIP_CENTRAL_PAYMENT_NOTICE } from "@/lib/dropship/settlement-types";
import type { CatalogOrder } from "@/lib/orders/types";

interface OrderDropshipSupplierPaymentPanelProps {
  order: CatalogOrder;
}

export function OrderDropshipSupplierPaymentPanel({
  order,
}: OrderDropshipSupplierPaymentPanelProps) {
  const hasDropship = useMemo(
    () => catalogOrderHasDropshipLines(order),
    [order],
  );

  if (!hasDropship) return null;

  return (
    <section className="orders-slideover-section">
      <p className="orders-slideover-label">Pago a Alcéntimo (cierre diario)</p>
      <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <ShieldCheck
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <span>{DROPSHIP_CENTRAL_PAYMENT_NOTICE}</span>
      </p>
      <a
        href="#daily-dropship-settlement"
        className="btn-brand-outline mt-3 inline-flex items-center justify-center gap-2 !min-h-10 !text-xs"
      >
        <Banknote className="h-4 w-4" aria-hidden="true" />
        Ir al cierre diario
      </a>
    </section>
  );
}
