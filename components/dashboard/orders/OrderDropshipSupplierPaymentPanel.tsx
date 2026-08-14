"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { PaymentCheckoutDetails } from "@/components/payments/PaymentCheckoutDetails";
import { formatUsd } from "@/lib/format";
import { catalogOrderHasDropshipLines } from "@/lib/dropship/catalog-order-dropship";
import {
  getDropshipSupplierPaymentContext,
  markDropshipSupplierPaymentNotified,
  reportDropshipSupplierPayment,
  type DropshipSupplierPaymentContext,
} from "@/lib/dropship/merchant-supplier-payment";
import {
  DROPSHIP_NO_INTERMEDIATION_NOTICE,
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  SUPPLIER_ORDER_PAYMENT_STATUS_LABELS,
  type SupplierB2bPaymentMethodKey,
} from "@/lib/supplier/payment-types";
import { describeSupplierPaymentMethods } from "@/lib/supplier/whatsapp-payment-message";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { CatalogOrder } from "@/lib/orders/types";
import { cn } from "@/lib/cn";

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
  const [context, setContext] = useState<DropshipSupplierPaymentContext | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<SupplierB2bPaymentMethodKey>("pagoMovil");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!hasDropship) {
      setContext(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void getDropshipSupplierPaymentContext(order.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        setContext(null);
        return;
      }
      const next = result.context ?? null;
      setContext(next);
      if (next?.supplierOrder?.paymentMethod) {
        const method = next.supplierOrder.paymentMethod;
        if (
          method === "pagoMovil" ||
          method === "transferencia" ||
          method === "zelle"
        ) {
          setPaymentMethod(method);
        }
      }
      if (next?.supplierOrder?.paymentReference) {
        setPaymentReference(next.supplierOrder.paymentReference);
      }
      if (next?.supplierOrder?.paymentNotes) {
        setPaymentNotes(next.supplierOrder.paymentNotes);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasDropship, order.id]);

  if (!hasDropship) return null;

  const enabledMethods = context
    ? describeSupplierPaymentMethods(context.paymentConfig)
    : [];
  const selectedMethodFields =
    context?.paymentConfig.methods[paymentMethod]?.fields ?? {};

  function handleReport(openWhatsApp: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await reportDropshipSupplierPayment({
        catalogOrderId: order.id,
        paymentMethod,
        paymentReference,
        paymentNotes,
      });
      if (result.error || !result.order) {
        setError(result.error ?? "No se pudo registrar el pago.");
        return;
      }

      setContext((current) =>
        current
          ? {
              ...current,
              supplierOrder: result.order!,
              whatsappUrl: result.whatsappUrl ?? null,
              whatsappMessage: result.whatsappMessage ?? null,
            }
          : current,
      );
      setMessage("Pago al proveedor registrado.");

      if (openWhatsApp) {
        if (result.whatsappUrl) {
          window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
          if (result.order.id) {
            void markDropshipSupplierPaymentNotified(result.order.id);
          }
        } else {
          setError(
            "Pago guardado, pero el proveedor aún no configuró un WhatsApp de cobro.",
          );
        }
      }
    });
  }

  return (
    <section className="orders-slideover-section">
      <p className="orders-slideover-label">Pago al proveedor (dropshipping)</p>
      <p className="mt-1 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <ShieldCheck
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <span>{DROPSHIP_NO_INTERMEDIATION_NOTICE}</span>
      </p>

      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando datos del proveedor…
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}

      {context ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              Costo base a pagar al proveedor:{" "}
              <span className="tabular-nums">
                {formatUsd(context.costTotalUsd)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {context.lineCount} línea
              {context.lineCount === 1 ? "" : "s"} dropshipping · el cobro al
              cliente final ya lo recibiste tú.
            </p>
            {context.supplierOrder ? (
              <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {
                  SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[
                    context.supplierOrder.paymentStatus
                  ]
                }
                {context.supplierOrder.paymentReference
                  ? ` · Ref. ${context.supplierOrder.paymentReference}`
                  : ""}
              </p>
            ) : null}
          </div>

          {context.paymentConfig.instructions.trim() ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {context.paymentConfig.instructions}
            </p>
          ) : null}

          {enabledMethods.length === 0 ? (
            <p className="text-sm text-zinc-500">
              El proveedor aún no publicó métodos de pago. Puedes registrar la
              referencia igual y notificarle por WhatsApp cuando configure su
              número.
            </p>
          ) : (
            <div className="space-y-2">
              {enabledMethods.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => setPaymentMethod(method.key)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    paymentMethod === method.key
                      ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950",
                  )}
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {method.label}
                  </span>
                </button>
              ))}
              {context.paymentConfig.methods[paymentMethod]?.enabled ? (
                <PaymentCheckoutDetails
                  methodKey={paymentMethod}
                  fields={selectedMethodFields}
                />
              ) : null}
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <label className="label-field" htmlFor="dropship-pay-method">
                Método usado
              </label>
              <select
                id="dropship-pay-method"
                className="input-field"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as SupplierB2bPaymentMethodKey,
                  )
                }
                disabled={pending}
              >
                {SUPPLIER_B2B_PAYMENT_METHOD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {getPaymentMethod(key)?.label ?? key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field" htmlFor="dropship-pay-ref">
                Referencia de pago
              </label>
              <input
                id="dropship-pay-ref"
                className="input-field"
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Ej: 123456789"
                disabled={pending}
              />
            </div>
            <div>
              <label className="label-field" htmlFor="dropship-pay-notes">
                Notas (opcional)
              </label>
              <textarea
                id="dropship-pay-notes"
                rows={2}
                className="input-field resize-none"
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-brand-outline inline-flex flex-1 items-center justify-center gap-2 !min-h-10 !text-xs"
              onClick={() => handleReport(false)}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Registrar pago al proveedor
            </button>
            <button
              type="button"
              className="btn-brand inline-flex flex-1 items-center justify-center gap-2 !min-h-10 !text-xs"
              onClick={() => handleReport(true)}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              )}
              Notificar pago por WhatsApp
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : !loading && !error ? (
        <p className="mt-3 text-sm text-zinc-500">
          No hay datos de proveedor disponibles para este pedido.
        </p>
      ) : null}
    </section>
  );
}
