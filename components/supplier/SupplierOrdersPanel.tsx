"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PackagePlus, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SupplierProduct } from "@/lib/supplier/actions";
import {
  createSupplierOrder,
  updateSupplierOrderDispatch,
} from "@/lib/supplier/order-actions";
import {
  SUPPLIER_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUS_LABELS,
  SUPPLIER_SHIPPING_CARRIER_OPTIONS,
  supplierCarrierLabel,
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";

interface SupplierOrdersPanelProps {
  initialOrders: SupplierOrder[];
  products: SupplierProduct[];
}

function formatOrderDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function SupplierOrdersPanel({
  initialOrders,
  products,
}: SupplierOrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [showCreate, setShowCreate] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("mrw");
  const [shippingBranchName, setShippingBranchName] = useState("");
  const [shippingBranchAddress, setShippingBranchAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lineProductId, setLineProductId] = useState(products[0]?.id ?? "");
  const [lineQty, setLineQty] = useState("1");
  const [draftLines, setDraftLines] = useState<
    Array<{ productId: string; quantity: number }>
  >([]);

  const [editStatus, setEditStatus] = useState<SupplierOrderStatus>("pendiente");
  const [editTracking, setEditTracking] = useState("");

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? null,
    [orders, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditStatus(selected.status);
    setEditTracking(selected.trackingNumber ?? "");
  }, [selected]);

  const productTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) map.set(product.id, product.title);
    return map;
  }, [products]);

  function selectOrder(order: SupplierOrder) {
    setSelectedId(order.id);
    setEditStatus(order.status);
    setEditTracking(order.trackingNumber ?? "");
    setError(null);
    setMessage(null);
  }

  function addDraftLine() {
    const qty = Math.floor(Number(lineQty));
    if (!lineProductId || !Number.isFinite(qty) || qty <= 0) {
      setError("Selecciona producto y una cantidad válida.");
      return;
    }
    setDraftLines((current) => {
      const existing = current.find((line) => line.productId === lineProductId);
      if (existing) {
        return current.map((line) =>
          line.productId === lineProductId
            ? { ...line, quantity: line.quantity + qty }
            : line,
        );
      }
      return [...current, { productId: lineProductId, quantity: qty }];
    });
    setLineQty("1");
    setError(null);
  }

  function handleCreateOrder() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createSupplierOrder({
        buyerName,
        buyerPhone,
        buyerAddress,
        shippingCarrier,
        shippingBranchName,
        shippingBranchAddress,
        notes,
        items: draftLines,
      });

      if (result.error || !result.order) {
        setError(result.error ?? "No se pudo registrar el pedido.");
        return;
      }

      setOrders((current) => [result.order!, ...current]);
      selectOrder(result.order);
      setShowCreate(false);
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setShippingBranchName("");
      setShippingBranchAddress("");
      setNotes("");
      setDraftLines([]);
      setMessage("Pedido registrado.");
    });
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
        setError(result.error ?? "No se pudo actualizar el despacho.");
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === result.order!.id ? result.order! : order,
        ),
      );
      setMessage("Despacho actualizado.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="supplier-hub-card-header">
        <div>
          <p className="supplier-hub-section-label">Operaciones</p>
          <h1 className="supplier-hub-heading">Pedidos recibidos</h1>
          <p className="supplier-hub-subheading">
            Gestiona despachos a comerciantes: datos de envío, estatus y número
            de guía.
          </p>
        </div>
        <button
          type="button"
          className={cn(
            showCreate ? "btn-brand-outline" : "btn-brand",
            "!min-h-9 !px-3.5 !text-xs",
          )}
          onClick={() => setShowCreate((value) => !value)}
        >
          <PackagePlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {showCreate ? "Cerrar formulario" : "Registrar pedido"}
        </button>
      </div>

      {showCreate ? (
        <section className="supplier-hub-card">
          <h2 className="supplier-hub-heading text-base">Nuevo pedido</h2>
          <p className="supplier-hub-subheading">
            Úsalo para registrar pedidos recibidos por WhatsApp o del marketplace
            de mayoristas. Descuenta stock automáticamente.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="so-buyer-name">
                Nombre del comprador
              </label>
              <input
                id="so-buyer-name"
                className="input-field"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                disabled={pending}
              />
            </div>
            <div>
              <label className="label-field" htmlFor="so-buyer-phone">
                Teléfono
              </label>
              <input
                id="so-buyer-phone"
                className="input-field"
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor="so-buyer-address">
                Dirección de destino
              </label>
              <textarea
                id="so-buyer-address"
                rows={2}
                className="input-field resize-none"
                value={buyerAddress}
                onChange={(event) => setBuyerAddress(event.target.value)}
                disabled={pending}
              />
            </div>
            <div>
              <label className="label-field" htmlFor="so-carrier">
                Agencia de envío
              </label>
              <select
                id="so-carrier"
                className="input-field"
                value={shippingCarrier}
                onChange={(event) => setShippingCarrier(event.target.value)}
                disabled={pending}
              >
                {SUPPLIER_SHIPPING_CARRIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field" htmlFor="so-branch">
                Sucursal / oficina
              </label>
              <input
                id="so-branch"
                className="input-field"
                value={shippingBranchName}
                onChange={(event) => setShippingBranchName(event.target.value)}
                placeholder="Ej: MRW Valencia Norte"
                disabled={pending}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field" htmlFor="so-branch-address">
                Dirección de la agencia
              </label>
              <input
                id="so-branch-address"
                className="input-field"
                value={shippingBranchAddress}
                onChange={(event) =>
                  setShippingBranchAddress(event.target.value)
                }
                disabled={pending}
              />
            </div>
          </div>

          <div className="supplier-hub-soft-panel mt-4">
            <p className="supplier-hub-section-label">Productos</p>
            {products.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Primero carga productos en la pestaña Productos.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label className="label-field" htmlFor="so-product">
                    Producto
                  </label>
                  <select
                    id="so-product"
                    className="input-field"
                    value={lineProductId}
                    onChange={(event) => setLineProductId(event.target.value)}
                    disabled={pending}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} · stock {product.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="label-field" htmlFor="so-qty">
                    Cant.
                  </label>
                  <input
                    id="so-qty"
                    type="number"
                    min={1}
                    step={1}
                    className="input-field"
                    value={lineQty}
                    onChange={(event) => setLineQty(event.target.value)}
                    disabled={pending}
                  />
                </div>
                <button
                  type="button"
                  className="btn-brand-outline !min-h-10 !px-3 !text-xs"
                  onClick={addDraftLine}
                  disabled={pending}
                >
                  Añadir
                </button>
              </div>
            )}

            {draftLines.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {draftLines.map((line) => (
                  <li
                    key={line.productId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-zinc-700 dark:text-zinc-200">
                      {line.quantity}×{" "}
                      {productTitleById.get(line.productId) ?? "Producto"}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:underline"
                      onClick={() =>
                        setDraftLines((current) =>
                          current.filter(
                            (entry) => entry.productId !== line.productId,
                          ),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-3">
            <label className="label-field" htmlFor="so-notes">
              Notas internas
            </label>
            <textarea
              id="so-notes"
              rows={2}
              className="input-field resize-none"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              className="btn-brand"
              onClick={handleCreateOrder}
              disabled={pending || draftLines.length === 0}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Guardar pedido
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="supplier-hub-success">{message}</p> : null}

      {orders.length === 0 ? (
        <p className="supplier-hub-empty">
          Aún no hay pedidos. Cuando un comerciante compre tus productos (o
          registres uno manualmente), aparecerán aquí.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <ul className="supplier-hub-list">
            {orders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => selectOrder(order)}
                  className={cn(
                    "supplier-hub-order-row",
                    selectedId === order.id && "supplier-hub-order-row-active",
                  )}
                >
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {order.buyerName}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {formatOrderDate(order.createdAt)} ·{" "}
                    {formatUsd(order.totalUsd)}
                  </span>
                  <span
                    className={cn(
                      "mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      statusBadgeClass(order.status),
                    )}
                  >
                    {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
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
                    {selected.buyerName}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pedido · {formatOrderDate(selected.createdAt)}
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

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="supplier-hub-soft-panel">
                  <p className="supplier-hub-section-label">Comprador</p>
                  <p className="mt-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {selected.buyerName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {selected.buyerPhone ?? "Sin teléfono"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {selected.buyerAddress ?? "Sin dirección"}
                  </p>
                </div>

                <div className="supplier-hub-soft-panel">
                  <p className="supplier-hub-section-label">Envío</p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    <Truck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {supplierCarrierLabel(selected.shippingCarrier)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {selected.shippingBranchName ?? "Sin sucursal indicada"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {selected.shippingBranchAddress ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="supplier-hub-section-label">Productos</p>
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
                          {item.unitCostUsd != null &&
                          item.unitCostUsd !== item.unitPriceUsd
                            ? ` · costo ${formatUsd(item.unitCostUsd)}`
                            : ""}
                          {item.costLockedAt
                            ? " · costo congelado"
                            : ""}
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

              {selected.notes.trim() ? (
                <p className="supplier-hub-soft-panel mt-4 text-xs text-zinc-600 dark:text-zinc-300">
                  Notas: {selected.notes}
                </p>
              ) : null}

              <div className="mt-6 border-t border-emerald-100 pt-5 dark:border-emerald-900/40">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Estatus de despacho
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-field" htmlFor="so-status">
                      Estatus
                    </label>
                    <select
                      id="so-status"
                      className="input-field"
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as SupplierOrderStatus)
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
                  <div>
                    <label className="label-field" htmlFor="so-tracking">
                      Número de guía
                    </label>
                    <input
                      id="so-tracking"
                      className="input-field"
                      value={editTracking}
                      onChange={(event) => setEditTracking(event.target.value)}
                      placeholder="Ej: MRW-123456789"
                      disabled={pending}
                    />
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
                  Guardar despacho
                </button>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
