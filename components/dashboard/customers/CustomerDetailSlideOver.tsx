"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import { formatUsd } from "@/lib/format";
import { ORDER_ESTADO_LABELS } from "@/lib/orders/order-status";
import {
  fetchCustomerDetail,
  saveCustomerMerchantNotes,
  type MerchantCustomerOrderRow,
} from "@/lib/customers/merchant-customer-actions";
import { CustomerWhatsAppButton } from "@/components/dashboard/customers/CustomerWhatsAppButton";
import { cn } from "@/lib/cn";

interface CustomerDetailSlideOverProps {
  customer: StoreCustomerSummary | null;
  open: boolean;
  storeName: string;
  onClose: () => void;
  onNotesSaved?: (customerUserId: string, notes: string) => void;
}

function formatCustomerDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerDetailSlideOver({
  customer,
  open,
  storeName,
  onClose,
  onNotesSaved,
}: CustomerDetailSlideOverProps) {
  const [orders, setOrders] = useState<MerchantCustomerOrderRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, startLoadTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!open || !customer) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, customer, onClose]);

  useEffect(() => {
    if (!open || !customer) {
      setOrders([]);
      setNotes("");
      setLoadError(null);
      setSaveError(null);
      return;
    }

    startLoadTransition(async () => {
      setLoadError(null);
      const result = await fetchCustomerDetail(customer.userId);
      if (!result.ok) {
        setLoadError(result.error);
        setOrders([]);
        setNotes("");
        return;
      }
      setOrders(result.orders);
      setNotes(result.merchantNotes);
    });
  }, [open, customer]);

  if (!open || !customer) return null;

  const displayName = customer.displayName?.trim() || "Sin nombre";
  const averageTicket =
    customer.orderCount > 0
      ? customer.totalSpentUsd / customer.orderCount
      : 0;

  function handleSaveNotes() {
    if (!customer) return;

    startSaveTransition(async () => {
      setSaveError(null);
      const result = await saveCustomerMerchantNotes({
        customerUserId: customer.userId,
        notes,
      });

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }

      onNotesSaved?.(customer.userId, result.merchantNotes);
    });
  }

  return (
    <div className="orders-slideover-root" role="presentation">
      <button
        type="button"
        className="orders-slideover-backdrop"
        aria-label="Cerrar perfil del cliente"
        onClick={onClose}
      />

      <aside
        className="orders-slideover-panel customers-slideover-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-slideover-title"
      >
        <header className="orders-slideover-header">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Perfil del cliente
            </p>
            <h2
              id="customer-slideover-title"
              className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {displayName}
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-500">
              {customer.phone?.trim() || "Sin teléfono"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="txn-icon-btn shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="orders-slideover-body">
          <div className="customers-slideover-actions">
            <CustomerWhatsAppButton
              customerName={customer.displayName}
              phone={customer.phone}
              storeName={storeName}
            />
          </div>

          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Valor del cliente</p>
            <dl className="customers-slideover-metrics">
              <div>
                <dt>Total gastado</dt>
                <dd>{formatUsd(customer.totalSpentUsd)}</dd>
              </div>
              <div>
                <dt>Pedidos</dt>
                <dd>{customer.orderCount}</dd>
              </div>
              <div>
                <dt>Ticket promedio</dt>
                <dd>{formatUsd(averageTicket)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-zinc-500">
              Última compra: {formatCustomerDate(customer.lastOrderAt)}
            </p>
          </section>

          <section className="orders-slideover-section">
            <p className="orders-slideover-label">Historial de pedidos</p>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando pedidos…
              </div>
            ) : loadError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Este cliente aún no tiene pedidos vinculados a su cuenta.
              </p>
            ) : (
              <ul className="customers-order-history">
                {orders.map((order) => (
                  <li key={order.id} className="customers-order-history-item">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {order.publicId}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {order.formattedDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatUsd(order.total_usd)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {ORDER_ESTADO_LABELS[order.estado]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="orders-slideover-section">
            <label htmlFor="customer-merchant-notes" className="orders-slideover-label">
              Notas internas
            </label>
            <textarea
              id="customer-merchant-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Preferencias, recordatorios o contexto comercial…"
              className="customers-notes-input"
            />
            {saveError ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>
            ) : null}
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={saving || loading}
              className={cn("btn-primary mt-3 w-full", saving && "opacity-70")}
            >
              {saving ? "Guardando…" : "Guardar notas"}
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}
