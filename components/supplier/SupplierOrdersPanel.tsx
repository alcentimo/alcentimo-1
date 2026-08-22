"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Download,
  Loader2,
  Search,
  Truck,
} from "lucide-react";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import type { SupplierProduct } from "@/lib/supplier/actions";
import {
  updateSupplierOrderDispatch,
} from "@/lib/supplier/order-actions";
import {
  SUPPLIER_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUS_LABELS,
  supplierCarrierLabel,
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";
import { isHubCollectionSupplierOrder, hubOrderHasPackingDestination, HUB_COLLECTION_BUYER_NAME } from "@/lib/dropship/hub-collection";
import { SUPPLIER_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";

interface SupplierOrdersPanelProps {
  initialOrders: SupplierOrder[];
  products: SupplierProduct[];
}

type SupplierOrderFilterId = "all" | SupplierOrderStatus;

const FILTER_TABS: {
  id: SupplierOrderFilterId;
  label: string;
}[] = [
  { id: "all", label: "Todos" },
  { id: "pendiente", label: "Apartar stock" },
  { id: "preparando", label: "Listos para recolección" },
  { id: "despachado", label: "Recolectados" },
];

function formatOrderDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOrderCode(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

function statusBadgeClass(status: SupplierOrderStatus): string {
  switch (status) {
    case "despachado":
      return "supplier-hub-status-despachado";
    case "preparando":
      return "supplier-hub-status-preparando";
    default:
      return "supplier-hub-status-pendiente";
  }
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function summarizeProducts(order: SupplierOrder): string {
  if (order.items.length === 0) return "Sin productos";
  return order.items
    .map((item) => `${item.quantity}× ${item.productTitle}`)
    .join(", ");
}

function orderMatchesQuery(order: SupplierOrder, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const code = formatOrderCode(order.id).toLowerCase();
  const products = summarizeProducts(order).toLowerCase();
  const haystack = [
    isHubCollectionSupplierOrder(order)
      ? order.buyerName && order.buyerName !== HUB_COLLECTION_BUYER_NAME
        ? order.buyerName
        : ""
      : order.buyerName,
    order.senderName ?? "",
    order.id,
    code,
    order.trackingNumber ?? "",
    products,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function buildOrdersCsv(orders: SupplierOrder[]): string {
  const headers = [
    "codigo",
    "id",
    "tipo",
    "productos",
    "destinatario",
    "cedula",
    "telefono",
    "destino",
    "estado",
    "liquidacion_alcentimo",
    "total_usd",
    "creado_en",
  ];

  const lines = [headers.join(",")];
  for (const order of orders) {
    lines.push(
      [
        formatOrderCode(order.id),
        order.id,
        "Orden de compra Alcéntimo",
        summarizeProducts(order),
        order.buyerName,
        order.buyerDocumentId ?? "",
        order.buyerPhone ?? "",
        [
          order.buyerAddress,
          order.shippingBranchName,
          order.shippingBranchAddress,
        ]
          .filter(Boolean)
          .join(" · "),
        SUPPLIER_ORDER_STATUS_LABELS[order.status],
        SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus],
        order.totalUsd.toFixed(2),
        order.createdAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}

export function SupplierOrdersPanel({
  initialOrders,
}: SupplierOrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] =
    useState<SupplierOrderFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [editStatus, setEditStatus] = useState<SupplierOrderStatus>("pendiente");
  const [editTracking, setEditTracking] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      return orderMatchesQuery(order, searchQuery);
    });
  }, [orders, statusFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    const counts: Record<SupplierOrderFilterId, number> = {
      all: orders.length,
      pendiente: 0,
      preparando: 0,
      despachado: 0,
    };
    for (const order of orders) {
      counts[order.status] += 1;
    }
    return counts;
  }, [orders]);

  const selected = useMemo(
    () => filteredOrders.find((order) => order.id === selectedId) ?? null,
    [filteredOrders, selectedId],
  );

  useEffect(() => {
    if (filteredOrders.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!filteredOrders.some((order) => order.id === selectedId)) {
      setSelectedId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setEditStatus(selected.status);
    setEditTracking(selected.trackingNumber ?? "");
  }, [selected]);

  function selectOrder(order: SupplierOrder) {
    setSelectedId(order.id);
    setEditStatus(order.status);
    setEditTracking(order.trackingNumber ?? "");
    setError(null);
    setMessage(null);
  }

  function handleExportCsv() {
    if (filteredOrders.length === 0) {
      setError("No hay órdenes para exportar con el filtro actual.");
      setMessage(null);
      return;
    }

    const csv = buildOrdersCsv(filteredOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ordenes-compra-alcentimo-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setError(null);
    setMessage(
      `Exportadas ${filteredOrders.length} orden${filteredOrders.length === 1 ? "" : "es"} en CSV.`,
    );
  }

  function handleSaveDispatch() {
    if (!selected) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSupplierOrderDispatch({
        orderId: selected.id,
        status: editStatus,
        trackingNumber: editTracking,
      });

      if (result.error || !result.order) {
        setError(result.error ?? "No se pudo actualizar el estatus.");
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === result.order!.id ? result.order! : order,
        ),
      );
      setMessage("Estatus de recolección actualizado.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="supplier-hub-card-header">
        <div>
          <p className="supplier-hub-section-label">Órdenes de compra</p>
          <h1 className="supplier-hub-heading">Pedidos de Alcéntimo</h1>
          <p className="supplier-hub-subheading">
            Alcéntimo te compra estos productos. Tu función es apartar el stock
            para que el personal de logística de Alcéntimo pase a retirarlo. No
            despaches ni cobres al cliente ni al dropshipper.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-brand-outline !min-h-9 !px-3.5 !text-xs"
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            title="Descargar órdenes filtradas en CSV"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="supplier-hub-success">{message}</p> : null}

      {orders.length === 0 ? (
        <p className="supplier-hub-empty">
          Aún no hay órdenes de compra. Cuando Alcéntimo te asigne productos
          para surtir, aparecerán aquí para que apartes el stock.
        </p>
      ) : (
        <>
          <div className="supplier-hub-orders-toolbar">
            <div
              className="supplier-hub-orders-filters"
              role="tablist"
              aria-label="Filtrar órdenes de compra por estado"
            >
              {FILTER_TABS.map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setStatusFilter(tab.id)}
                    className={cn(
                      "supplier-hub-filter-chip",
                      isActive && "supplier-hub-filter-chip-active",
                    )}
                  >
                    {tab.label}
                    <span className="supplier-hub-filter-chip-count">
                      {filterCounts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="supplier-hub-orders-search">
              <Search
                className="h-4 w-4 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar producto o código…"
                aria-label="Buscar órdenes por producto o código"
                className="supplier-hub-orders-search-input"
              />
            </label>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="supplier-hub-empty">
              No hay órdenes con este filtro
              {searchQuery.trim() ? " o búsqueda" : ""}.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <ul className="supplier-hub-list">
                {filteredOrders.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => selectOrder(order)}
                      className={cn(
                        "supplier-hub-order-row",
                        selectedId === order.id &&
                          "supplier-hub-order-row-active",
                      )}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {summarizeProducts(order)}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
                          #{formatOrderCode(order.id)}
                        </span>
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {formatOrderDate(order.createdAt)} ·{" "}
                        {formatUsd(order.totalUsd)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            statusBadgeClass(order.status),
                          )}
                        >
                          {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {order.paymentStatus !== "pendiente" ||
                        order.paymentReference ? (
                          <span className="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            {
                              SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[
                                order.paymentStatus
                              ]
                            }
                          </span>
                        ) : null}
                        {order.shipOn ? (
                          <span className="inline-flex w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                            D+1 {formatBusinessDateEs(order.shipOn)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {selected ? (
                <section className="supplier-hub-card">
                  <div className="supplier-hub-card-header">
                    <div>
                      <h2 className="supplier-hub-heading text-base">
                        Orden de compra Alcéntimo
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        #{formatOrderCode(selected.id)} ·{" "}
                        {formatOrderDate(selected.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusBadgeClass(selected.status),
                      )}
                    >
                      {SUPPLIER_ORDER_STATUS_LABELS[selected.status]}
                    </span>
                  </div>

                  {isHubCollectionSupplierOrder(selected) ? (
                    <>
                      <div className="supplier-hub-soft-panel mt-5">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Alcéntimo te compra estos productos.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                          Apártalos en tu almacén. El personal de logística de
                          Alcéntimo pasará a retirarlos. No despaches, no cobres
                          al cliente ni al dropshipper: Alcéntimo te liquida.
                        </p>
                      </div>
                      {hubOrderHasPackingDestination(selected) ? (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="supplier-hub-soft-panel">
                            <p className="supplier-hub-section-label">
                              Referencia para logística Alcéntimo
                            </p>
                            <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {selected.buyerName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                              {selected.buyerDocumentId
                                ? `Cédula ${selected.buyerDocumentId}`
                                : "Sin cédula"}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                              {selected.buyerPhone ?? "Sin teléfono"}
                            </p>
                          </div>
                          <div className="supplier-hub-soft-panel">
                            <p className="supplier-hub-section-label">
                              Recolección
                            </p>
                            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              <Truck
                                className="h-3.5 w-3.5 text-emerald-600"
                                aria-hidden="true"
                              />
                              {supplierCarrierLabel(selected.shippingCarrier)}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                              {selected.buyerAddress ??
                                selected.shippingBranchName ??
                                "El equipo de Alcéntimo coordinará el retiro."}
                            </p>
                            {selected.shippingBranchName &&
                            selected.buyerAddress &&
                            !selected.buyerAddress.includes(
                              selected.shippingBranchName,
                            ) ? (
                              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                                Sucursal: {selected.shippingBranchName}
                              </p>
                            ) : null}
                            {selected.shippingBranchAddress ? (
                              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {selected.shippingBranchAddress}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-zinc-500">
                          Cuando Alcéntimo programe la recolección, verás aquí
                          la referencia para el equipo de logística.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="supplier-hub-soft-panel mt-5">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Orden asignada por Alcéntimo
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Aparta el stock. Logística de Alcéntimo retira. No
                        operes como tienda independiente ni cobres por tu
                        cuenta.
                      </p>
                    </div>
                  )}

                  <div className="mt-5">
                    <p className="supplier-hub-section-label">
                      Productos a apartar
                    </p>
                    <ul className="mt-2 divide-y divide-emerald-50 overflow-hidden rounded-xl border border-emerald-100 dark:divide-emerald-950/40 dark:border-emerald-900/40">
                      {selected.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 bg-white px-3 py-2.5 text-sm dark:bg-zinc-950"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {item.quantity}× {item.productTitle}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatUsd(item.unitPriceUsd)} c/u
                              {item.costLockedAt ? " · costo congelado" : ""}
                            </p>
                          </div>
                          <span className="shrink-0 tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                            {formatUsd(item.lineTotalUsd)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Total {formatUsd(selected.totalUsd)}
                    </p>
                  </div>

                  <div className="supplier-hub-soft-panel mt-4">
                    <p className="supplier-hub-section-label">
                      Liquidación de Alcéntimo
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {
                        SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[
                          selected.paymentStatus
                        ]
                      }
                    </p>
                    {selected.shipOn ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Recolección a partir del{" "}
                        {formatBusinessDateEs(selected.shipOn)}.
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {selected.settlementId
                        ? "Alcéntimo ya programó tu liquidación por esta compra. El dropshipper no te paga."
                        : selected.paymentMethod
                          ? `Alcéntimo te pagará por ${
                              getPaymentMethod(
                                selected.paymentMethod as never,
                              )?.label ?? selected.paymentMethod
                            }`
                          : "Alcéntimo te pagará al recoger. Tú no cobras al cliente ni al dropshipper."}
                    </p>
                    {selected.paymentReference ? (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        Referencia Alcéntimo: {selected.paymentReference}
                      </p>
                    ) : null}
                    {selected.dispatchNotifiedAt ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Aviso enviado:{" "}
                        {formatOrderDate(selected.dispatchNotifiedAt)}
                      </p>
                    ) : null}
                  </div>

                  {selected.notes.trim() ? (
                    <p className="supplier-hub-soft-panel mt-4 text-xs text-zinc-600 dark:text-zinc-300">
                      Notas: {selected.notes}
                    </p>
                  ) : null}

                  <div className="mt-6 border-t border-emerald-100 pt-5 dark:border-emerald-900/40">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Estatus de recolección
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-1">
                      <div>
                        <label className="label-field" htmlFor="so-status">
                          Estatus
                        </label>
                        <select
                          id="so-status"
                          className="input-field"
                          value={editStatus}
                          onChange={(event) =>
                            setEditStatus(
                              event.target.value as SupplierOrderStatus,
                            )
                          }
                          disabled={pending}
                        >
                          {SUPPLIER_ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {SUPPLIER_ORDER_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-brand mt-4"
                      onClick={handleSaveDispatch}
                      disabled={pending}
                    >
                      {pending ? (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      Guardar estatus de retiro
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
