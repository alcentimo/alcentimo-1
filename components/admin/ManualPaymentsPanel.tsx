"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import type { ManualPaymentStatus } from "@/lib/database.types";
import type { ManualPaymentWithEmail } from "@/lib/plans/get-manual-payments";
import {
  rejectManualPayment,
  verifyManualPayment,
} from "@/lib/plans/manual-payment-admin-actions";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<ManualPaymentStatus, string> = {
  pending: "Pendiente",
  verified: "Confirmado",
  rejected: "Rechazado",
};

const STATUS_CLASS: Record<ManualPaymentStatus, string> = {
  pending:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  verified:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Pro",
  premium: "Business",
};

function formatPaymentDate(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function storeLabel(payment: ManualPaymentWithEmail): string {
  if (payment.stores.length === 0) return "Sin tienda asociada";
  if (payment.stores.length === 1) {
    return `${payment.stores[0].name} (/${payment.stores[0].slug})`;
  }
  return payment.stores
    .map((store) => `${store.name} (/${store.slug})`)
    .join(" · ");
}

interface ManualPaymentsPanelProps {
  initialPayments: ManualPaymentWithEmail[];
}

export function ManualPaymentsPanel({
  initialPayments,
}: ManualPaymentsPanelProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState<ManualPaymentStatus | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter((item) => item.status === filter);
  }, [filter, payments]);

  const counts = useMemo(() => {
    return payments.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { pending: 0, verified: 0, rejected: 0 } as Record<
        ManualPaymentStatus,
        number
      >,
    );
  }, [payments]);

  function handleConfirmPayment(paymentId: string) {
    setError(null);
    setSuccess(null);
    setUpdatingId(paymentId);
    startTransition(async () => {
      const result = await verifyManualPayment(paymentId);
      setUpdatingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      const payment = payments.find((item) => item.id === paymentId);
      const planName = PLAN_LABELS[payment?.plan_id ?? ""] ?? "pagado";
      const storeName = payment ? storeLabel(payment) : "la tienda";

      setPayments((prev) =>
        prev.map((item) =>
          item.id === paymentId
            ? {
                ...item,
                status: "verified" as const,
                verified_at: new Date().toISOString(),
                owner_plan: item.plan_id === "premium" ? "BUSINESS" : "PRO",
                owner_subscription_status: "active",
              }
            : item,
        ),
      );
      setSuccess(
        `Pago confirmado: ${storeName} quedó con Plan ${planName} (active).`,
      );
    });
  }

  function handleReject(paymentId: string) {
    setError(null);
    setSuccess(null);
    setUpdatingId(paymentId);
    startTransition(async () => {
      const result = await rejectManualPayment(paymentId);
      setUpdatingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setPayments((prev) =>
        prev.map((item) =>
          item.id === paymentId
            ? {
                ...item,
                status: "rejected" as const,
                rejected_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "verified", "rejected"] as const).map((key) => {
          const label =
            key === "all"
              ? `Todos (${payments.length})`
              : `${STATUS_LABELS[key]} (${counts[key]})`;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {filter === "pending"
            ? "No hay tiendas con pago pendiente."
            : "No hay pagos en este filtro."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((payment) => {
            const isUpdating = updatingId === payment.id && pending;
            return (
              <li
                key={payment.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STATUS_CLASS[payment.status],
                        )}
                      >
                        {STATUS_LABELS[payment.status]}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatPaymentDate(payment.created_at)}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {storeLabel(payment)}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Plan solicitado:{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {PLAN_LABELS[payment.plan_id] ?? payment.plan_id}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Dueño: {payment.user_email ?? payment.owner_id}
                    </p>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      owner_id: {payment.owner_id}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Perfil actual: {payment.owner_plan ?? "—"} /{" "}
                      {payment.owner_subscription_status ?? "—"}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      Ref:{" "}
                      <span className="font-mono">{payment.reference_number}</span>
                    </p>
                    <a
                      href={payment.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
                    >
                      Ver comprobante
                    </a>
                  </div>

                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 sm:h-24 sm:w-40 dark:border-zinc-800 dark:bg-zinc-900">
                    <Image
                      src={payment.image_url}
                      alt="Comprobante de pago"
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized
                    />
                  </div>
                </div>

                {payment.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleConfirmPayment(payment.id)}
                      className="btn-brand px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {isUpdating ? "Activando plan…" : "Confirmar Pago"}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleReject(payment.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      Rechazar
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
