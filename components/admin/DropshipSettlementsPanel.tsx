"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { AdminCriticalConfirmDialog } from "@/components/admin/AdminCriticalConfirmDialog";
import {
  approveDropshipDailySettlement,
  rejectDropshipDailySettlement,
} from "@/lib/dropship/settlement-admin-actions";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  DROPSHIP_SETTLEMENT_STATUS_LABELS,
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type DropshipSettlementRecord,
  type DropshipSettlementStatus,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { SettlementCustomerShipments } from "@/components/dropship/SettlementCustomerShipments";
import { cn } from "@/lib/cn";

type SettlementFilter = "all" | "reported" | "approved" | "rejected";

const FILTERS: Array<{ key: SettlementFilter; label: string }> = [
  { key: "reported", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
];

const STATUS_CLASS: Record<DropshipSettlementStatus, string> = {
  reported:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  approved:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected:
    "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
};

function formatReportedAt(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface DropshipSettlementsPanelProps {
  initialSettlements: DropshipSettlementRecord[];
}

export function DropshipSettlementsPanel({
  initialSettlements,
}: DropshipSettlementsPanelProps) {
  const [settlements, setSettlements] = useState(initialSettlements);
  const [filter, setFilter] = useState<SettlementFilter>("reported");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [approveId, setApproveId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      settlements.filter((item) =>
        filter === "all" ? true : item.status === filter,
      ),
    [filter, settlements],
  );

  const counts = useMemo(
    () => ({
      all: settlements.length,
      reported: settlements.filter((item) => item.status === "reported").length,
      approved: settlements.filter((item) => item.status === "approved").length,
      rejected: settlements.filter((item) => item.status === "rejected").length,
    }),
    [settlements],
  );

  const financials = useMemo(() => {
    const active = settlements.filter(
      (item) => item.status === "reported" || item.status === "approved",
    );
    const byDropshipper = new Map<
      string,
      {
        storeName: string;
        merchantEmail: string | null;
        receivedUsd: number;
        markupUsd: number;
        wholesaleUsd: number;
        orderCount: number;
      }
    >();
    const bySupplier = new Map<
      string,
      { name: string; amountUsd: number; orderCount: number; lineCount: number }
    >();

    let receivedUsd = 0;
    let markupUsd = 0;
    let wholesaleUsd = 0;

    for (const item of active) {
      receivedUsd += item.amountDueUsd;
      markupUsd += item.platformMarkupUsd;
      wholesaleUsd += item.wholesaleCostUsd;

      const storeKey = item.storeId || item.merchantUserId;
      const current = byDropshipper.get(storeKey) ?? {
        storeName: item.storeName || "Tienda",
        merchantEmail: item.merchantEmail,
        receivedUsd: 0,
        markupUsd: 0,
        wholesaleUsd: 0,
        orderCount: 0,
      };
      current.receivedUsd += item.amountDueUsd;
      current.markupUsd += item.platformMarkupUsd;
      current.wholesaleUsd += item.wholesaleCostUsd;
      current.orderCount += item.orderCount;
      byDropshipper.set(storeKey, current);

      const supplierRows =
        item.suppliers.length > 0
          ? item.suppliers.map((supplier) => ({
              id: supplier.supplierUserId,
              name: supplier.supplierName,
              amountUsd: supplier.wholesaleCostUsd,
              orderCount: supplier.orderCount,
              lineCount: supplier.lineCount,
            }))
          : item.payouts.map((payout) => ({
              id: payout.supplierUserId,
              name: payout.supplierName,
              amountUsd: payout.amountUsd,
              orderCount: payout.orderCount,
              lineCount: payout.lineCount,
            }));

      for (const row of supplierRows) {
        const existing = bySupplier.get(row.id) ?? {
          name:
            row.name?.trim() ||
            `Mayorista ${row.id.slice(0, 8).toUpperCase()}`,
          amountUsd: 0,
          orderCount: 0,
          lineCount: 0,
        };
        if (row.name?.trim()) existing.name = row.name.trim();
        existing.amountUsd += row.amountUsd;
        existing.orderCount += row.orderCount;
        existing.lineCount += row.lineCount;
        bySupplier.set(row.id, existing);
      }
    }

    return {
      receivedUsd,
      markupUsd,
      wholesaleUsd,
      dropshippers: Array.from(byDropshipper.values()),
      suppliers: Array.from(bySupplier.values()).sort(
        (a, b) => b.amountUsd - a.amountUsd,
      ),
    };
  }, [settlements]);

  const approveTarget = settlements.find((item) => item.id === approveId);

  function replaceSettlement(next: DropshipSettlementRecord) {
    setSettlements((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
  }

  function handleApprove() {
    if (!approveId) return;
    setError(null);
    setSuccess(null);
    setUpdatingId(approveId);
    startTransition(async () => {
      const result = await approveDropshipDailySettlement({
        settlementId: approveId,
      });
      setUpdatingId(null);
      setApproveId(null);
      if (result.error || !result.settlement) {
        setError(result.error ?? "No se pudo aprobar el reporte.");
        return;
      }
      replaceSettlement(result.settlement);
      setSuccess(
        "Pago aprobado. Se dividió el monto en saldos (mayoristas y comisión Alcéntimo), se notificó a cada proveedor y se habilitó el despacho D+1 con el nombre de la tienda como remitente.",
      );
    });
  }

  function handleReject() {
    if (!rejectId) return;
    setError(null);
    setSuccess(null);
    setUpdatingId(rejectId);
    startTransition(async () => {
      const result = await rejectDropshipDailySettlement({
        settlementId: rejectId,
        reviewNotes: rejectNotes,
      });
      setUpdatingId(null);
      if (result.error || !result.settlement) {
        setError(result.error ?? "No se pudo rechazar el reporte.");
        return;
      }
      replaceSettlement(result.settlement);
      setRejectId(null);
      setRejectNotes("");
      setSuccess("Reporte rechazado. El dropshipper puede volver a liquidar esas ventas.");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cada dropshipper agrupa las ventas del día en un solo pago a Alcéntimo
        (un comprobante, banco y referencia). Al aprobarlo verás el destino de
        cada comprador para armar los paquetes, el monto recibido, la comisión
        de Alcéntimo y lo que corresponde liquidar a cada mayorista.
      </p>

      {financials.dropshippers.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
            Desglose financiero consolidado
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-teal-800/80 dark:text-teal-200/80">
                Recibido de dropshippers
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatUsd(financials.receivedUsd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-teal-800/80 dark:text-teal-200/80">
                Comisión Alcéntimo
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatUsd(financials.markupUsd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-teal-800/80 dark:text-teal-200/80">
                A liquidar a mayoristas
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatUsd(financials.wholesaleUsd)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-teal-800/80 dark:text-teal-200/80">
                Dropshippers
              </dt>
              <dd className="font-semibold tabular-nums">
                {financials.dropshippers.length}
              </dd>
            </div>
          </dl>
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
                Por dropshipper
              </p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {financials.dropshippers.map((item) => (
                  <li
                    key={`${item.storeName}-${item.merchantEmail ?? ""}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">
                      {item.storeName}
                      {item.merchantEmail ? ` · ${item.merchantEmail}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium">
                      {formatUsd(item.receivedUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {financials.suppliers.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
                  Por mayorista
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {financials.suppliers.map((item) => (
                    <li
                      key={`${item.name}-${item.orderCount}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="min-w-0 truncate">
                        {item.name}
                        <span className="ml-1 text-teal-800/70 dark:text-teal-200/70">
                          · {item.orderCount} pedido
                          {item.orderCount === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium">
                        {formatUsd(item.amountUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              filter === item.key
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200",
            )}
          >
            {item.label}
            <span className="ml-1.5 tabular-nums opacity-80">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          No hay reportes en este filtro.
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((settlement) => (
            <li
              key={settlement.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {settlement.storeName || "Tienda"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {settlement.merchantEmail ?? "Sin correo"} ·{" "}
                    {formatBusinessDateEs(settlement.businessDate)} · reportado{" "}
                    {formatReportedAt(settlement.reportedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
                    STATUS_CLASS[settlement.status],
                  )}
                >
                  {DROPSHIP_SETTLEMENT_STATUS_LABELS[settlement.status]}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-zinc-500">Monto recibido</dt>
                  <dd className="font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                    {formatUsd(settlement.amountDueUsd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Comisión Alcéntimo</dt>
                  <dd className="font-medium tabular-nums">
                    {formatUsd(settlement.platformMarkupUsd)} ({settlement.markupPercent}%)
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">A mayoristas</dt>
                  <dd className="font-medium tabular-nums">
                    {formatUsd(settlement.wholesaleCostUsd)} · {settlement.orderCount}{" "}
                    pedido{settlement.orderCount === 1 ? "" : "s"}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-xs text-zinc-500">
                Método:{" "}
                {settlement.paymentMethod
                  ? (getPaymentMethod(settlement.paymentMethod as never)?.label ??
                    settlement.paymentMethod)
                  : "—"}
                {settlement.paymentReference
                  ? ` · Ref. ${settlement.paymentReference}`
                  : ""}
              </p>
              {settlement.paymentNotes ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Notas: {settlement.paymentNotes}
                </p>
              ) : null}
              {settlement.reviewNotes ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Revisión: {settlement.reviewNotes}
                </p>
              ) : null}

              {settlement.paymentProofUrl ? (
                <a
                  href={settlement.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex max-w-xs items-center gap-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <span className="relative block h-20 w-20 shrink-0 bg-zinc-100 dark:bg-zinc-900">
                    <Image
                      src={settlement.paymentProofUrl}
                      alt="Comprobante de liquidación diaria"
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                  <span className="inline-flex items-center gap-1 pr-3 text-xs font-medium text-teal-700 dark:text-teal-300">
                    Ver comprobante
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </a>
              ) : (
                <p className="mt-3 text-xs text-amber-700">Sin comprobante adjunto.</p>
              )}

              <SettlementCustomerShipments
                className="mt-4"
                shipments={settlement.shipments}
                variant="admin"
              />

              <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-900/50">
                <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                  División del pago recibido
                </p>
                <ul className="mt-1 space-y-1">
                  <li className="flex justify-between gap-3">
                    <span>Monto recibido del dropshipper</span>
                    <span className="tabular-nums font-medium">
                      {formatUsd(settlement.amountDueUsd)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>Comisión Alcéntimo</span>
                    <span className="tabular-nums font-medium">
                      {formatUsd(settlement.platformMarkupUsd)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>A liquidar a mayoristas</span>
                    <span className="tabular-nums font-medium">
                      {formatUsd(settlement.wholesaleCostUsd)}
                    </span>
                  </li>
                </ul>
                {(settlement.suppliers.length > 0
                  ? settlement.suppliers
                  : settlement.payouts
                ).length > 0 ? (
                  <>
                    <p className="mt-2 font-semibold text-zinc-700 dark:text-zinc-200">
                      A cada mayorista
                    </p>
                    <ul className="mt-1 space-y-1">
                      {settlement.suppliers.length > 0
                        ? settlement.suppliers.map((supplier) => (
                            <li
                              key={supplier.supplierUserId}
                              className="flex justify-between gap-3"
                            >
                              <span className="min-w-0 truncate">
                                {supplier.supplierName ||
                                  `Mayorista ${supplier.supplierUserId.slice(0, 8).toUpperCase()}`}
                                <span className="ml-1 text-zinc-500">
                                  · {supplier.orderCount} pedido
                                  {supplier.orderCount === 1 ? "" : "s"}
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums font-medium">
                                {formatUsd(supplier.wholesaleCostUsd)}
                              </span>
                            </li>
                          ))
                        : settlement.payouts.map((payout) => (
                            <li
                              key={payout.id}
                              className="flex justify-between gap-3"
                            >
                              <span className="min-w-0 truncate">
                                {payout.supplierName ||
                                  `Mayorista ${payout.supplierUserId.slice(0, 8).toUpperCase()}`}
                                <span className="ml-1 text-zinc-500">
                                  · {payout.orderCount} pedido
                                  {payout.orderCount === 1 ? "" : "s"} · D+1{" "}
                                  {formatBusinessDateEs(payout.shipOn)}
                                </span>
                              </span>
                              <span className="shrink-0 tabular-nums font-medium">
                                {formatUsd(payout.amountUsd)}
                              </span>
                            </li>
                          ))}
                    </ul>
                  </>
                ) : null}
                {settlement.payouts.length > 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Obligaciones:{" "}
                    {settlement.payouts
                      .map(
                        (payout) =>
                          `${SUPPLIER_PAYOUT_STATUS_LABELS[payout.status]} ${formatBusinessDateEs(payout.shipOn)}`,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
                {settlement.ledger.length > 0 ? (
                  <>
                    <p className="mt-2 font-semibold text-zinc-700 dark:text-zinc-200">
                      Saldos registrados
                    </p>
                    <ul className="mt-1 space-y-1">
                      {settlement.ledger.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {entry.partyKind === "platform"
                              ? "Alcéntimo (comisión)"
                              : entry.partyName
                                ? `${entry.partyName} (costo)`
                                : "Mayorista (costo)"}
                          </span>
                          <span className="tabular-nums font-medium">
                            {formatUsd(entry.amountUsd)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              {settlement.status === "reported" ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="btn-brand inline-flex flex-1 items-center justify-center !min-h-10 !text-xs"
                    disabled={pending && updatingId === settlement.id}
                    onClick={() => setApproveId(settlement.id)}
                  >
                    Verificar y aprobar
                  </button>
                  <button
                    type="button"
                    className="btn-brand-outline inline-flex flex-1 items-center justify-center !min-h-10 !text-xs"
                    disabled={pending && updatingId === settlement.id}
                    onClick={() => {
                      setRejectId(settlement.id);
                      setRejectNotes("");
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              ) : null}

              {rejectId === settlement.id ? (
                <div className="mt-3 space-y-2 rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                  <label className="label-field" htmlFor={`reject-notes-${settlement.id}`}>
                    Motivo del rechazo
                  </label>
                  <textarea
                    id={`reject-notes-${settlement.id}`}
                    rows={2}
                    className="input-field resize-none"
                    value={rejectNotes}
                    onChange={(event) => setRejectNotes(event.target.value)}
                    disabled={pending}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-brand inline-flex items-center justify-center !min-h-9 !bg-red-600 !text-xs hover:!bg-red-700"
                      disabled={pending}
                      onClick={handleReject}
                    >
                      Confirmar rechazo
                    </button>
                    <button
                      type="button"
                      className="btn-brand-outline !min-h-9 !text-xs"
                      disabled={pending}
                      onClick={() => setRejectId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AdminCriticalConfirmDialog
        open={Boolean(approveId)}
        onOpenChange={(open) => {
          if (!open) setApproveId(null);
        }}
        title="Aprobar liquidación diaria"
        impact={
          approveTarget
            ? `Vas a verificar el pago de ${approveTarget.storeName} por ${formatUsd(approveTarget.amountDueUsd)}. Revisa el comprobante y el destino de cada paquete (nombre, cédula, teléfono y sucursal/dirección) antes de aprobar. Se acreditará el costo a cada mayorista y se habilitará el despacho D+1.`
            : "Vas a aprobar este reporte diario."
        }
        confirmLabel="Aprobar y habilitar D+1"
        loading={pending && updatingId === approveId}
        onConfirm={handleApprove}
      />
    </div>
  );
}
