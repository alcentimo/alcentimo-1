"use client";

import { useMemo, useState } from "react";
import { ChevronDown, IdCard, MapPin, Package, Phone, Truck, User } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import { groupSettlementShipments } from "@/lib/dropship/settlement-shipping";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";
import type {
  DropshipSettlementLineView,
  DropshipSettlementShipmentView,
} from "@/lib/dropship/settlement-types";

function shortOrderId(orderId: string): string {
  if (!orderId) return "—";
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

function digitsPhoneHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+${digits.startsWith("58") ? digits : `58${digits.replace(/^0/, "")}`}`;
}

function shipmentKey(shipment: DropshipSettlementShipmentView, index: number) {
  return shipment.catalogOrderId || `${shipment.productTitles.join("-")}-${index}`;
}

function shipmentProducts(shipment: DropshipSettlementShipmentView) {
  if (shipment.products && shipment.products.length > 0) {
    return shipment.products;
  }
  return shipment.productTitles.map((title) => ({
    title,
    quantity: shipment.quantity,
    supplierUserId: "",
    supplierName: null as string | null,
  }));
}

function compactAgencyLabel(shipment: DropshipSettlementShipmentView): string {
  const shipping = shipment.shipping;
  const agency = shipping?.shippingMethodLabel || shipping?.fulfillmentLabel;
  if (agency) return agency;
  return "Sin agencia";
}

interface SettlementCustomerShipmentsProps {
  shipments?: DropshipSettlementShipmentView[];
  lines?: DropshipSettlementLineView[];
  variant?: "merchant" | "admin";
  className?: string;
  emptyLabel?: string;
  /** Lista compacta con acordeón. Por defecto en dropshipper; admin queda expandido. */
  collapsible?: boolean;
}

export function SettlementCustomerShipments({
  shipments,
  lines,
  variant = "merchant",
  className,
  emptyLabel,
  collapsible,
}: SettlementCustomerShipmentsProps) {
  const items =
    shipments && shipments.length > 0
      ? shipments
      : groupSettlementShipments(lines ?? []);

  const isAdmin = variant === "admin";
  const useAccordion = collapsible ?? !isAdmin;
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const productCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  if (items.length === 0) {
    if (!emptyLabel) return null;
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed border-zinc-200 px-3 py-3 text-xs text-zinc-500 dark:border-zinc-800",
          className,
        )}
      >
        {emptyLabel}
      </p>
    );
  }

  function toggle(key: string) {
    setOpenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {isAdmin ? "Pedidos de clientes finales" : "Pedidos del día"}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {items.length} pedido{items.length === 1 ? "" : "s"} · {productCount}{" "}
          producto{productCount === 1 ? "" : "s"}
          {useAccordion ? " · toca uno para ver el detalle" : ""}
        </p>
      </div>

      <ul className={cn(useAccordion ? "divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800" : "space-y-3")}>
        {items.map((shipment, index) => {
          const key = shipmentKey(shipment, index);
          const open = !useAccordion || openKeys.has(key);
          const shipping = shipment.shipping;
          const products = shipmentProducts(shipment);

          if (!useAccordion) {
            return (
              <li
                key={key}
                className="rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-3 dark:border-teal-900/50 dark:bg-teal-950/20"
              >
                <ShipmentDetail
                  shipment={shipment}
                  products={products}
                  isAdmin={isAdmin}
                  showHeader
                />
              </li>
            );
          }

          return (
            <li key={key} className="bg-white dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-400 transition",
                    open && "rotate-180",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {shipping?.customerName || "Sin nombre"}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {compactAgencyLabel(shipment)}
                    {shipping?.shippingBranchName
                      ? ` · ${shipping.shippingBranchName}`
                      : ""}
                    {` · ${products.length} prod.`}
                    {` · ${shortOrderId(shipment.catalogOrderId)}`}
                  </span>
                </span>
              </button>
              {open ? (
                <div className="border-t border-zinc-100 px-3 py-3 dark:border-zinc-800">
                  <ShipmentDetail
                    shipment={shipment}
                    products={products}
                    isAdmin={isAdmin}
                    showHeader={false}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShipmentDetail({
  shipment,
  products,
  isAdmin,
  showHeader,
}: {
  shipment: DropshipSettlementShipmentView;
  products: ReturnType<typeof shipmentProducts>;
  isAdmin: boolean;
  showHeader: boolean;
}) {
  const shipping = shipment.shipping;
  const agencyLabel = shipping?.shippingMethodLabel ?? null;
  const isAgency = isNationalCarrierKey(shipping?.shippingMethod);
  const phoneHref = shipping?.customerPhone
    ? digitsPhoneHref(shipping.customerPhone)
    : null;

  return (
    <>
      {showHeader ? (
        <div
          className={cn(
            "flex flex-wrap items-start gap-2",
            isAdmin && "justify-between",
          )}
        >
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            Pedido {shortOrderId(shipment.catalogOrderId)}
          </p>
          {isAdmin ? (
            <p className="text-xs tabular-nums text-zinc-500">
              {formatUsd(shipment.lineDueUsd)}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className={cn("space-y-1.5 text-sm", showHeader && "mt-2")}>
        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Nombre del comprador
            </dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {shipping?.customerName || "Sin nombre"}
            </dd>
          </div>
        </div>

        {shipping?.customerDocumentId ? (
          <div className="flex items-start gap-2">
            <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Cédula
              </dt>
              <dd className="text-zinc-800 dark:text-zinc-200">
                {shipping.customerDocumentId}
              </dd>
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-2">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Teléfono
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {shipping?.customerPhone ? (
                phoneHref ? (
                  <a
                    href={phoneHref}
                    className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
                  >
                    {shipping.customerPhone}
                  </a>
                ) : (
                  shipping.customerPhone
                )
              ) : (
                "Sin teléfono"
              )}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {isAgency ? "Agencia de encomienda" : "Método de envío"}
            </dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {agencyLabel || shipping?.fulfillmentLabel || "Sin agencia registrada"}
            </dd>
            {isAgency && shipping?.shippingBranchName ? (
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                Sucursal: {shipping.shippingBranchName}
              </p>
            ) : null}
            {isAgency && shipping?.shippingBranchAddress ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                {shipping.shippingBranchAddress}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Dirección
            </dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {shipping?.deliveryAddress ||
                shipping?.shippingBranchAddress ||
                shipping?.destinationLabel ||
                "Sin dirección registrada"}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-3 border-t border-zinc-200/80 pt-2 dark:border-zinc-800">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Productos vendidos
        </p>
        <ul className="mt-1.5 space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
          {products.map((product) => (
            <li
              key={`${product.supplierUserId}-${product.title}`}
              className="flex justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="font-medium">{product.title}</span>
                {isAdmin && product.supplierName ? (
                  <span className="ml-1 text-xs text-zinc-500">
                    · {product.supplierName}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                ×{product.quantity}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
