"use client";

import { useMemo } from "react";
import { Banknote, PackageCheck, TrendingUp } from "lucide-react";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { formatUsd } from "@/lib/format";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import {
  SUPPLIER_ORDER_PAYMENT_STATUS_LABELS,
  type SupplierOrderPaymentStatus,
} from "@/lib/supplier/payment-types";
import { cn } from "@/lib/cn";

interface SupplierSalesHistoryPanelProps {
  orders: SupplierOrder[];
}

interface SaleRow {
  id: string;
  dateLabel: string;
  sortKey: string;
  productTitle: string;
  quantity: number;
  amountUsd: number;
  paymentStatus: SupplierOrderPaymentStatus;
}

function formatSaleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function paymentBadgeClass(status: SupplierOrderPaymentStatus): string {
  switch (status) {
    case "confirmado":
      return "supplier-hub-status-despachado";
    case "reportado":
      return "supplier-hub-status-preparando";
    default:
      return "supplier-hub-status-pendiente";
  }
}

function buildSaleRows(orders: SupplierOrder[]): SaleRow[] {
  const rows: SaleRow[] = [];
  for (const order of orders) {
    if (order.items.length === 0) {
      rows.push({
        id: `${order.id}-pedido`,
        dateLabel: formatSaleDate(order.createdAt),
        sortKey: order.createdAt,
        productTitle: "Pedido",
        quantity: 1,
        amountUsd: order.totalUsd,
        paymentStatus: order.paymentStatus,
      });
      continue;
    }
    for (const item of order.items) {
      rows.push({
        id: item.id,
        dateLabel: formatSaleDate(order.createdAt),
        sortKey: order.createdAt,
        productTitle: item.productTitle,
        quantity: item.quantity,
        amountUsd: item.lineTotalUsd,
        paymentStatus: order.paymentStatus,
      });
    }
  }
  rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  return rows;
}

export function SupplierSalesHistoryPanel({
  orders,
}: SupplierSalesHistoryPanelProps) {
  const rows = useMemo(() => buildSaleRows(orders), [orders]);
  const totals = useMemo(() => {
    let units = 0;
    let billedUsd = 0;
    for (const row of rows) {
      units += row.quantity;
      billedUsd += row.amountUsd;
    }
    return { units, billedUsd };
  }, [rows]);

  return (
    <div className="space-y-5">
      <h1 className="supplier-hub-heading">Historial de ventas</h1>

      <div className="supplier-hub-metrics !grid-cols-2 lg:!grid-cols-2">
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <PackageCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Unidades vendidas</p>
            <p className="supplier-hub-metric-value">
              {totals.units.toLocaleString("es")}
            </p>
          </div>
        </div>
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <Banknote className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Facturado con Alcéntimo</p>
            <p className="supplier-hub-metric-value">
              {formatUsd(totals.billedUsd)}
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <SupplierEmptyState
          icon={TrendingUp}
          title="Aún no hay ventas"
          description="Cuando Alcéntimo compre tu inventario, verás aquí cada línea: fecha, producto, unidades y el monto liquidado."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Producto</th>
                <th className="px-4 py-2.5 font-medium">Cantidad</th>
                <th className="px-4 py-2.5 font-medium">Monto liquidado</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white dark:bg-zinc-950">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {row.dateLabel}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {row.productTitle}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-200">
                    {row.quantity.toLocaleString("es")}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                    {formatUsd(row.amountUsd)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        paymentBadgeClass(row.paymentStatus),
                      )}
                    >
                      {SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[row.paymentStatus]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
