"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import type { ManualPaymentStatus } from "@/lib/database.types";
import type { ManualPaymentWithEmail } from "@/lib/plans/get-manual-payments";
import {
  permanentlyRejectManualPayment,
  requestPaymentCorrection,
  revertVerifiedManualPayment,
  verifyManualPayment,
} from "@/lib/plans/manual-payment-admin-actions";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<ManualPaymentStatus, string> = {
  pending: "Pendiente",
  needs_correction: "Corrección",
  verified: "Confirmado",
  rejected: "Rechazado",
};

const STATUS_CLASS: Record<ManualPaymentStatus, string> = {
  pending:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  needs_correction:
    "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50",
  verified:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Pro",
  premium: "Business",
};

const FILTERS = [
  "all",
  "pending",
  "needs_correction",
  "verified",
  "rejected",
] as const;

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

type DialogMode = "correction" | "reject" | null;

interface ManualPaymentsPanelProps {
  initialPayments: ManualPaymentWithEmail[];
}

export function ManualPaymentsPanel({
  initialPayments,
}: ManualPaymentsPanelProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState<ManualPaymentStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogPaymentId, setDialogPaymentId] = useState<string | null>(null);
  const [dialogReason, setDialogReason] = useState("");

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
      {
        pending: 0,
        needs_correction: 0,
        verified: 0,
        rejected: 0,
      } as Record<ManualPaymentStatus, number>,
    );
  }, [payments]);

  function closeDialog() {
    setDialogMode(null);
    setDialogPaymentId(null);
    setDialogReason("");
  }

  function openDialog(mode: Exclude<DialogMode, null>, paymentId: string) {
    setDialogMode(mode);
    setDialogPaymentId(paymentId);
    setDialogReason("");
    setError(null);
    setSuccess(null);
  }

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
                permanently_rejected: false,
                admin_note: null,
                owner_plan: item.plan_id === "premium" ? "BUSINESS" : "PRO",
                owner_subscription_status: "active",
              }
            : item,
        ),
      );
      const credit =
        typeof result.creditUsd === "number" && result.creditUsd > 0
          ? ` Saldo a favor: $${result.creditUsd.toFixed(2)} · A pagar: $${(result.amountDueUsd ?? 0).toFixed(2)}.`
          : "";
      setSuccess(
        `Pago confirmado: ${storeName} quedó con Plan ${planName} (active).${credit}`,
      );
    });
  }

  function handleRevertConfirmation(paymentId: string) {
    setError(null);
    setSuccess(null);
    setUpdatingId(paymentId);
    startTransition(async () => {
      const result = await revertVerifiedManualPayment(paymentId);
      setUpdatingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      const payment = payments.find((item) => item.id === paymentId);

      setPayments((prev) =>
        prev.map((item) =>
          item.id === paymentId
            ? {
                ...item,
                status: "pending" as const,
                verified_at: null,
                permanently_rejected: false,
                rejected_at: null,
                // El plan del usuario no cambia; solo el estado del pago.
              }
            : item,
        ),
      );
      setSuccess(
        `Confirmación revertida: el pago de ${
          payment ? storeLabel(payment) : "la tienda"
        } volvió a Pendiente. El plan del usuario se mantiene sin cambios.`,
      );
    });
  }

  function submitDialog() {
    if (!dialogMode || !dialogPaymentId) return;

    setError(null);
    setSuccess(null);
    setUpdatingId(dialogPaymentId);

    startTransition(async () => {
      const result =
        dialogMode === "correction"
          ? await requestPaymentCorrection(dialogPaymentId, dialogReason)
          : await permanentlyRejectManualPayment(
              dialogPaymentId,
              dialogReason || undefined,
            );

      setUpdatingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      const note = dialogReason.trim();
      setPayments((prev) =>
        prev.map((item) =>
          item.id === dialogPaymentId
            ? dialogMode === "correction"
              ? {
                  ...item,
                  status: "needs_correction" as const,
                  admin_note: note,
                  correction_requested_at: new Date().toISOString(),
                  permanently_rejected: false,
                }
              : {
                  ...item,
                  status: "rejected" as const,
                  rejected_at: new Date().toISOString(),
                  permanently_rejected: true,
                  admin_note:
                    note ||
                    "Rechazado permanentemente por el administrador.",
                }
            : item,
        ),
      );

      setSuccess(
        dialogMode === "correction"
          ? "Se solicitó corrección. El usuario verá el motivo en su panel."
          : "Pago anulado permanentemente. Esa referencia queda bloqueada.",
      );
      closeDialog();
    });
  }

  const dialogPayment = dialogPaymentId
    ? payments.find((item) => item.id === dialogPaymentId)
    : null;
  const isDialogBusy = Boolean(dialogPaymentId && updatingId === dialogPaymentId && pending);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((key) => {
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
          {filter === "all"
            ? "No hay pagos registrados."
            : "No hay pagos en este filtro."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((payment) => {
            const isUpdating = updatingId === payment.id && pending;
            const canConfirm =
              payment.status === "pending" ||
              payment.status === "needs_correction" ||
              payment.status === "rejected";
            const canRequestCorrection =
              payment.status === "pending" ||
              payment.status === "needs_correction";
            const canRevertConfirmation = payment.status === "verified";
            const canPermanentlyReject =
              payment.status === "pending" ||
              payment.status === "needs_correction" ||
              payment.status === "rejected" ||
              payment.status === "verified";
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
                        {payment.permanently_rejected ? " · Permanente" : ""}
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
                    {payment.admin_note ? (
                      <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        Nota: {payment.admin_note}
                      </p>
                    ) : null}
                    {payment.from_plan ||
                    payment.credit_usd != null ||
                    payment.amount_due_usd != null ? (
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        {payment.amount_due_usd != null ? (
                          <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                            Monto a confirmar: $
                            {Number(payment.amount_due_usd).toFixed(2)}
                          </p>
                        ) : null}
                        {payment.credit_usd != null &&
                        Number(payment.credit_usd) > 0 ? (
                          <p>
                            Saldo a favor: $
                            {Number(payment.credit_usd).toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
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

                {canConfirm ||
                canRequestCorrection ||
                canRevertConfirmation ||
                canPermanentlyReject ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canConfirm ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleConfirmPayment(payment.id)}
                        className="btn-brand px-4 py-2 text-sm disabled:opacity-60"
                      >
                        {isUpdating ? "Activando plan…" : "Confirmar Pago"}
                      </button>
                    ) : null}
                    {canRevertConfirmation ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleRevertConfirmation(payment.id)}
                        className="rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {isUpdating ? "Revirtiendo…" : "Revertir confirmación"}
                      </button>
                    ) : null}
                    {canRequestCorrection ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => openDialog("correction", payment.id)}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                      >
                        Solicitar corrección
                      </button>
                    ) : null}
                    {canPermanentlyReject ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => openDialog("reject", payment.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                      >
                        Rechazar definitivamente
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {dialogMode && dialogPayment ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {dialogMode === "correction"
                ? "Solicitar corrección"
                : "Rechazar definitivamente"}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {dialogMode === "correction"
                ? "El usuario verá este motivo y podrá volver a subir el comprobante. Su acceso provisional se mantiene. Si luego decides aceptar el pago, usa Confirmar Pago sin esperar al usuario."
                : "Anula la solicitud de forma permanente y bloquea reenviar la misma referencia. También puedes usar Confirmar Pago si cambias de opinión."}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {storeLabel(dialogPayment)} · Ref {dialogPayment.reference_number}
            </p>
            <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Motivo{dialogMode === "correction" ? " (obligatorio)" : " (opcional)"}
              <textarea
                value={dialogReason}
                onChange={(event) => setDialogReason(event.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder={
                  dialogMode === "correction"
                    ? "Ej. El comprobante está borroso / el monto no coincide…"
                    : "Ej. Comprobante inválido o manipulado…"
                }
                disabled={isDialogBusy}
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isDialogBusy}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitDialog}
                disabled={
                  isDialogBusy ||
                  (dialogMode === "correction" && dialogReason.trim().length < 8)
                }
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60",
                  dialogMode === "correction"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700",
                )}
              >
                {isDialogBusy
                  ? "Guardando…"
                  : dialogMode === "correction"
                    ? "Enviar solicitud"
                    : "Anular permanentemente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
