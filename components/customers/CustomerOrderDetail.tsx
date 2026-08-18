"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check, MessageCircle } from "lucide-react";
import { CustomerOrderEstadoPill } from "@/components/customers/CustomerOrderEstadoPill";
import { CustomerOrderPaymentProofUpload } from "@/components/customers/CustomerOrderPaymentProofUpload";
import { CustomerOrderStatusTimeline } from "@/components/customers/CustomerOrderStatusTimeline";
import {
  patchCustomerOrderDetail,
  useCustomerOrdersRealtime,
} from "@/components/customers/use-customer-orders-realtime";
import {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  type CustomerOrderDetail as CustomerOrderDetailModel,
} from "@/lib/customers/customer-orders-shared";
import { formatUsd } from "@/lib/format";
import { buildCustomerOrderInquiryWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import {
  getOrderFulfillmentDetailLabel,
  getOrderFulfillmentLabel,
  getOrderShippingMethodLabel,
} from "@/lib/orders/shipping-display";
import {
  CUSTOMER_ORDER_ESTADO_HINTS,
  orderAwaitsPaymentProof,
  resolveCustomerOrderDisplayEstado,
} from "@/lib/orders/order-status";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";

interface CustomerOrderDetailProps {
  storeSlug: string;
  storeId: string;
  userId: string;
  order: CustomerOrderDetailModel;
  storeWhatsAppPhone?: string | null;
}

export function CustomerOrderDetail({
  storeSlug,
  storeId,
  userId,
  order: initialOrder,
  storeWhatsAppPhone = null,
}: CustomerOrderDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [order, setOrder] = useState(initialOrder);
  const [orderBaseline, setOrderBaseline] = useState(initialOrder);
  const [copied, setCopied] = useState(false);

  if (initialOrder !== orderBaseline) {
    setOrderBaseline(initialOrder);
    setOrder(initialOrder);
  }

  const onUpdate = useCallback(
    (orderId: string, row: Record<string, unknown>) => {
      if (orderId !== order.id) return;
      setOrder((current) => patchCustomerOrderDetail(current, row));
    },
    [order.id],
  );

  useCustomerOrdersRealtime({
    storeId,
    userId,
    onUpdate,
  });

  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);

  const methodLabel = getOrderShippingMethodLabel(order);
  const fulfillmentLabel = getOrderFulfillmentLabel(order);
  const isNational =
    order.shipping_method != null &&
    isNationalCarrierKey(order.shipping_method);
  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta", {
    pathname,
  });
  const publicId = formatCustomerOrderPublicId(order.id);
  const whatsappUrl = buildCustomerOrderInquiryWhatsAppUrl(
    storeWhatsAppPhone,
    order.id,
  );
  const needsPaymentProof = orderAwaitsPaymentProof(order);
  const displayEstado = resolveCustomerOrderDisplayEstado(order);

  async function copyTracking() {
    if (!order.tracking_number) return;
    try {
      await navigator.clipboard.writeText(order.tracking_number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="customer-order-detail">
      <Link href={accountPath} className="customer-order-back">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Mis compras
      </Link>

      <header className="customer-order-detail-header">
        <div>
          <p className="customer-orders-id">Pedido {publicId}</p>
          <p className="customer-orders-date mt-1">
            {formatCustomerOrderDate(order.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="customer-orders-total">{formatUsd(order.total_usd)}</p>
          <CustomerOrderEstadoPill
            estado={order.estado}
            paymentProofUrl={order.payment_proof_url}
          />
        </div>
      </header>

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="customer-orders-whatsapp-btn w-full sm:w-auto"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>Consultar pedido por WhatsApp</span>
        </a>
      ) : null}

      <section className="customer-order-section">
        <h2 className="customer-order-section-title">Seguimiento</h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          {CUSTOMER_ORDER_ESTADO_HINTS[displayEstado]} Se actualiza en tiempo
          real. Cuando Alcéntimo despache, verás aquí el número de guía.
        </p>
        <CustomerOrderStatusTimeline estado={displayEstado} />

        {needsPaymentProof ? (
          <div className="mt-4 rounded-xl border border-orange-200/80 bg-orange-50/70 px-4 py-3 text-left dark:border-orange-900/40 dark:bg-orange-950/25">
            <p className="text-sm font-medium text-orange-950 dark:text-orange-100">
              Falta enviar tu comprobante
            </p>
            <p className="mt-1 text-xs leading-relaxed text-orange-950/80 dark:text-orange-100/80">
              Sube la imagen del pago aquí para que la tienda pueda verificarlo.
              Mientras no haya comprobante, el pedido permanece en{" "}
              <strong>Pendiente de pago</strong>.
            </p>
            <CustomerOrderPaymentProofUpload
              storeSlug={storeSlug}
              orderId={order.id}
              onUploaded={({ paymentProofUrl, estado }) => {
                setOrder((current) => ({
                  ...current,
                  payment_proof_url: paymentProofUrl,
                  estado,
                }));
                router.refresh();
              }}
            />
          </div>
        ) : null}
      </section>

      {order.tracking_number ? (
        <section className="customer-order-tracking-card">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Número de guía
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {order.tracking_number}
            </p>
            <button
              type="button"
              onClick={() => void copyTracking()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50 dark:border-violet-900/50 dark:bg-zinc-950 dark:text-violet-200 dark:hover:bg-violet-950/40"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar
                </>
              )}
            </button>
          </div>
          {isNational && methodLabel ? (
            <p className="mt-2 text-xs text-violet-800/80 dark:text-violet-200/80">
              Consulta este número en el sitio o agencia de {methodLabel}.
            </p>
          ) : (
            <p className="mt-2 text-xs text-violet-800/80 dark:text-violet-200/80">
              Úsalo para ubicar tu paquete con la tienda o el transportista.
            </p>
          )}
        </section>
      ) : null}

      <section className="customer-order-section">
        <h2 className="customer-order-section-title">Envío</h2>
        {fulfillmentLabel || methodLabel || order.delivery_address ? (
          <dl className="customer-order-dl">
            {fulfillmentLabel ? (
              <div>
                <dt>Tipo</dt>
                <dd>{fulfillmentLabel}</dd>
              </div>
            ) : null}
            {methodLabel ? (
              <div>
                <dt>{isNational ? "Agencia" : "Método"}</dt>
                <dd>{methodLabel}</dd>
              </div>
            ) : null}
            {isNational && order.shipping_branch_name ? (
              <div>
                <dt>Sucursal destino</dt>
                <dd>{order.shipping_branch_name}</dd>
              </div>
            ) : null}
            {order.shipping_branch_address ? (
              <div>
                <dt>Dirección de agencia</dt>
                <dd>{order.shipping_branch_address}</dd>
              </div>
            ) : null}
            {order.delivery_address ? (
              <div>
                <dt>{getOrderFulfillmentDetailLabel(order)}</dt>
                <dd>{order.delivery_address}</dd>
              </div>
            ) : null}
            {order.location_name ? (
              <div>
                <dt>Sucursal de la tienda</dt>
                <dd>{order.location_name}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sin datos de envío registrados en este pedido.
          </p>
        )}
      </section>

      <section className="customer-order-section">
        <h2 className="customer-order-section-title">Productos</h2>
        {order.items.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay líneas de producto disponibles.
          </p>
        ) : (
          <ul className="customer-order-items">
            {order.items.map((item) => (
              <li
                key={`${item.product_id}-${item.variant_id}-${item.product_name}`}
                className="customer-order-item-row"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.variant_name} · ×{item.quantity}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {formatUsd(item.line_total_usd)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">Total</span>
          <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatUsd(order.total_usd)}
          </span>
        </div>
      </section>
    </div>
  );
}
