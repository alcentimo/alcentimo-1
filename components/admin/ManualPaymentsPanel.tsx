"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
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
  needs_correction: "Corrección solicitada",
  verified: "Aprobado",
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
  enterprise: "Enterprise",
};

type PaymentFilter = "all" | "pending" | "verified" | "rejected";

const FILTERS: Array<{ key: PaymentFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "verified", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
];

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

function matchesFilter(
  status: ManualPaymentStatus,
  filter: PaymentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "pending") {
    return status === "pending" || status === "needs_correction";
  }
  if (filter === "verified") return status === "verified";
  return status === "rejected";
}

type DialogMode = "correction" | "reject" | null;

interface ManualPaymentsPanelProps {
  initialPayments: ManualPaymentWithEmail[];
}

export function ManualPaymentsPanel({
  initialPayments,
}: ManualPaymentsPanelProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogPaymentId, setDialogPaymentId] = useState<string | null>(null);
  const [dialogReason, setDialogReason] = useState("");

  const filtered = useMemo(
    () => payments.filter((item) => matchesFilter(item.status, filter)),
    [filter, payments],
  );

  const counts = useMemo(() => {
    return {
      all: payments.length,
      pending: payments.filter((item) =>
        matchesFilter(item.status, "pending"),
      ).length,
      verified: payments.filter((item) => item.status === "verified").length,
      rejected: payments.filter((item) => item.status === "rejected").length,
    };
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
                owner_plan: item.plan_id === "enterprise"
                  ? "ENTERPRISE"
                  : item.plan_id === "premium"
                    ? "BUSINESS"
                    : "PRO",
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
        `Pago aprobado: ${storeName} quedó con Plan ${planName} (active).${credit}`,
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
              }
            : item,
        ),
      );
      setSuccess(
        `Confirmación revertida: el pago de ${
          payment ? storeLabel(payment) : "la tienda"
        } volvió a Pendiente.`,
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
          : "Pago rechazado permanentemente.",
      );
      closeDialog();
    });
  }

  const dialogPayment = dialogPaymentId
    ? payments.find((item) => item.id === dialogPaymentId)
    : null;
  const isDialogBusy = Boolean(
    dialogPaymentId && updatingId === dialogPaymentId && pending,
  );

  return (
    <div className="space-y-4">
      <div className="admin-subnav">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "admin-subnav-item",
                active && "admin-subnav-item-active",
              )}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">({counts[key]})</span>
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
        <ul className="space-y-5">
          {filtered.map((payment) => {
            const isUpdating = updatingId === payment.id && pending;
            const canApprove =
              payment.status === "pending" ||
              payment.status === "needs_correction" ||
              payment.status === "rejected";
            const canRequestCorrection =
              payment.status === "pending" ||
              payment.status === "needs_correction";
            const canRevert = payment.status === "verified";
            const canReject =
              payment.status === "pending" ||
              payment.status === "needs_correction" ||
              payment.status === "rejected" ||
              payment.status === "verified";

            return (
              <li key={payment.id} className="admin-payment-card">
                <div className="admin-payment-card-grid">
                  <div className="admin-payment-receipt">
                    <a
                      href={payment.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-payment-receipt-link group"
                    >
                      <Image
                        src={payment.image_url}
                        alt="Comprobante de pago"
                        fill
                        className="object-contain p-2"
                        sizes="280px"
                        unoptimized
                      />
                      <span className="admin-payment-receipt-overlay">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Abrir en tamaño completo
                      </span>
                    </a>
                  </div>

                  <div className="admin-payment-details">
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

                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {storeLabel(payment)}
                    </h3>

                    <dl className="admin-payment-meta">
                      <div>
                        <dt>Plan solicitado</dt>
                        <dd>{PLAN_LABELS[payment.plan_id] ?? payment.plan_id}</dd>
                      </div>
                      <div>
                        <dt>Dueño</dt>
                        <dd>{payment.user_email ?? payment.owner_id}</dd>
                      </div>
                      <div>
                        <dt>Referencia</dt>
                        <dd className="font-mono">{payment.reference_number}</dd>
                      </div>
                      {payment.amount_due_usd != null ? (
                        <div className="admin-payment-amount">
                          <dt>Monto a confirmar</dt>
                          <dd>${Number(payment.amount_due_usd).toFixed(2)} USD</dd>
                        </div>
                      ) : null}
                      {payment.credit_usd != null &&
                      Number(payment.credit_usd) > 0 ? (
                        <div>
                          <dt>Saldo a favor</dt>
                          <dd>${Number(payment.credit_usd).toFixed(2)} USD</dd>
                        </div>
                      ) : null}
                    </dl>

                    {payment.admin_note ? (
                      <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        Nota admin: {payment.admin_note}
                      </p>
                    ) : null}

                    {canApprove || canRequestCorrection || canRevert || canReject ? (
                      <div className="admin-payment-actions">
                        {canApprove ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleConfirmPayment(payment.id)}
                            className="btn-brand px-4 py-2 text-sm disabled:opacity-60"
                          >
                            {isUpdating ? "Procesando…" : "Aprobar"}
                          </button>
                        ) : null}
                        {canRevert ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleRevertConfirmation(payment.id)}
                            className="admin-payment-action-secondary"
                          >
                            {isUpdating ? "Procesando…" : "Revertir"}
                          </button>
                        ) : null}
                        {canRequestCorrection ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => openDialog("correction", payment.id)}
                            className="admin-payment-action-warning"
                          >
                            Solicitar corrección
                          </button>
                        ) : null}
                        {canReject ? (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => openDialog("reject", payment.id)}
                            className="admin-payment-action-danger"
                          >
                            Rechazar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
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
                : "Rechazar pago"}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {dialogMode === "correction"
                ? "El usuario verá este motivo y podrá volver a subir el comprobante."
                : "Anula la solicitud de forma permanente y bloquea reenviar la misma referencia."}
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
                    : "Rechazar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
