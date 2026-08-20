import { IdCard, MapPin, Package, Phone, Truck, User } from "lucide-react";
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

interface SettlementCustomerShipmentsProps {
  shipments?: DropshipSettlementShipmentView[];
  lines?: DropshipSettlementLineView[];
  variant?: "merchant" | "admin";
  className?: string;
  emptyLabel?: string;
}

export function SettlementCustomerShipments({
  shipments,
  lines,
  variant = "merchant",
  className,
  emptyLabel,
}: SettlementCustomerShipmentsProps) {
  const items =
    shipments && shipments.length > 0
      ? shipments
      : groupSettlementShipments(lines ?? []);

  const isAdmin = variant === "admin";

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

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {isAdmin
            ? "Pedidos de clientes finales"
            : "Datos de envío del cliente final"}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {isAdmin
            ? "Misma ficha que el pedido del catálogo: comprador, teléfono, dirección, agencia (MRW/Zoom) y productos para armar el paquete con el mayorista."
            : "Estos datos viajan con tu liquidación para que Alcéntimo arme la guía sin errores."}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((shipment) => {
          const shipping = shipment.shipping;
          const agencyLabel = shipping?.shippingMethodLabel ?? null;
          const isAgency = isNationalCarrierKey(shipping?.shippingMethod);
          const products =
            shipment.products && shipment.products.length > 0
              ? shipment.products
              : shipment.productTitles.map((title) => ({
                  title,
                  quantity: shipment.quantity,
                  supplierUserId: "",
                  supplierName: null as string | null,
                }));
          const phoneHref = shipping?.customerPhone
            ? digitsPhoneHref(shipping.customerPhone)
            : null;

          return (
            <li
              key={shipment.catalogOrderId || shipment.productTitles.join("-")}
              className={cn(
                "rounded-xl border px-3 py-3",
                isAdmin
                  ? "border-teal-200 bg-teal-50/70 dark:border-teal-900/50 dark:bg-teal-950/20"
                  : "border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40",
              )}
            >
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

              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <User
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
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
                    <IdCard
                      className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                      aria-hidden="true"
                    />
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
                  <Phone
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
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
                  <Truck
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      {isAgency ? "Agencia de encomienda" : "Método de envío"}
                    </dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {agencyLabel ||
                        shipping?.fulfillmentLabel ||
                        "Sin agencia registrada"}
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
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
