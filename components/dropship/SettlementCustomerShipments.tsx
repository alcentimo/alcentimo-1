import { IdCard, MapPin, Package, Phone, User } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import { groupSettlementShipments } from "@/lib/dropship/settlement-shipping";
import type {
  DropshipSettlementLineView,
  DropshipSettlementShipmentView,
} from "@/lib/dropship/settlement-types";

function shortOrderId(orderId: string): string {
  if (!orderId) return "—";
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

interface SettlementCustomerShipmentsProps {
  shipments?: DropshipSettlementShipmentView[];
  lines?: DropshipSettlementLineView[];
  variant?: "merchant" | "admin";
  className?: string;
}

export function SettlementCustomerShipments({
  shipments,
  lines,
  variant = "merchant",
  className,
}: SettlementCustomerShipmentsProps) {
  const items =
    shipments && shipments.length > 0
      ? shipments
      : groupSettlementShipments(lines ?? []);

  if (items.length === 0) return null;

  const isAdmin = variant === "admin";

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p
          className={cn(
            "font-semibold text-zinc-900 dark:text-zinc-50",
            isAdmin ? "text-sm" : "text-sm",
          )}
        >
          {isAdmin
            ? "Destino para la guía de despacho"
            : "Datos de envío del cliente final"}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {isAdmin
            ? "Nombre, cédula, teléfono y destino (dirección o sucursal MRW/Zoom) de cada pedido incluido en este pago."
            : "Estos datos viajan con tu liquidación para que Alcéntimo arme la guía sin errores."}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((shipment) => {
          const shipping = shipment.shipping;
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <Package className="h-3.5 w-3.5" aria-hidden="true" />
                  Pedido {shortOrderId(shipment.catalogOrderId)}
                </p>
                <p className="text-xs tabular-nums text-zinc-500">
                  {formatUsd(shipment.lineDueUsd)}
                </p>
              </div>

              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <User
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Nombre</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {shipping?.customerName || "Sin nombre"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IdCard
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Cédula</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200">
                      {shipping?.customerDocumentId
                        ? `Cédula ${shipping.customerDocumentId}`
                        : "Sin cédula"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Teléfono</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200">
                      {shipping?.customerPhone || "Sin teléfono"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Destino</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                      {shipping?.destinationLabel || "Sin destino registrado"}
                    </dd>
                    {shipping?.fulfillmentLabel ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {shipping.fulfillmentLabel}
                        {shipping.shippingMethodLabel &&
                        shipping.fulfillmentLabel !==
                          shipping.shippingMethodLabel
                          ? ` · ${shipping.shippingMethodLabel}`
                          : ""}
                      </p>
                    ) : null}
                    {shipping?.shippingBranchName &&
                    shipping.destinationLabel &&
                    !shipping.destinationLabel.includes(
                      shipping.shippingBranchName,
                    ) ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Sucursal: {shipping.shippingBranchName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </dl>

              <p className="mt-2 text-xs text-zinc-500">
                {shipment.quantity} ud. · {shipment.productTitles.join(", ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
