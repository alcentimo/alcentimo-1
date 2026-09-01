"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import {
  createAdminGiftCards,
  listAdminGiftCards,
  setAdminGiftCardStatus,
} from "@/lib/admin/gift-card-actions";
import type { GiftCard } from "@/lib/gift-cards/types";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function statusLabel(status: GiftCard["status"]): string {
  if (status === "active") return "Activa";
  if (status === "disabled") return "Desactivada";
  return "Agotada";
}

export function AdminGiftCardsPanel() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [balance, setBalance] = useState("25");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  async function reload() {
    const result = await listAdminGiftCards();
    if (result.error && !result.cards) {
      setError(result.error);
      return;
    }
    setCards(result.cards ?? []);
    setStoreName(result.storeName ?? null);
    if (result.error) setError(result.error);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await listAdminGiftCards();
      if (cancelled) return;
      setLoading(false);
      setCards(result.cards ?? []);
      setStoreName(result.storeName ?? null);
      if (result.error) setError(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setMessage(null);
    const result = await createAdminGiftCards({
      initialBalanceUsd: Number(balance),
      quantity: Number(quantity),
      note,
    });
    setCreating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const created = result.cards ?? [];
    setMessage(
      created.length === 1
        ? `Tarjeta ${created[0]!.code} creada.`
        : `Se generaron ${created.length} tarjetas.`,
    );
    setNote("");
    await reload();
  }

  async function handleToggle(card: GiftCard) {
    if (card.status === "depleted") return;
    setBusyId(card.id);
    setError(null);
    const next = card.status === "active" ? "disabled" : "active";
    const result = await setAdminGiftCardStatus(card.id, next);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          <Gift className="h-5 w-5 opacity-70" aria-hidden="true" />
          Tarjetas de regalo
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Solo se emiten y canjean en tu vitrina de administrador
          {storeName ? ` (${storeName})` : ""}. No aparecen ni funcionan en
          tiendas de dropshippers.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Generar tarjetas
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block text-xs font-medium text-zinc-500">
            Saldo inicial (USD)
            <Input
              className="mt-1"
              type="number"
              min={1}
              step="0.01"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Cantidad (1–20)
            <Input
              className="mt-1"
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500 sm:col-span-2">
            Nota interna (opcional)
            <Input
              className="mt-1"
              value={note}
              maxLength={240}
              placeholder="Ej. campaña abril"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              "Generar"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando tarjetas…</p>
      ) : (
        <div className="admin-stores-table-shell">
          <div className="admin-stores-table-scroll">
            <table className="admin-stores-table min-w-[48rem]">
              <thead>
                <tr>
                  <th className="admin-stores-th">Código</th>
                  <th className="admin-stores-th">Saldo inicial</th>
                  <th className="admin-stores-th">Saldo actual</th>
                  <th className="admin-stores-th">Estado</th>
                  <th className="admin-stores-th">Nota</th>
                  <th className="admin-stores-th">Creada</th>
                  <th className="admin-stores-th">Acción</th>
                </tr>
              </thead>
              <tbody>
                {cards.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-stores-empty-state">
                      Aún no hay tarjetas. Genera la primera arriba.
                    </td>
                  </tr>
                ) : (
                  cards.map((card) => (
                    <tr key={card.id} className="admin-stores-row">
                      <td className="admin-stores-td font-mono text-sm">
                        {card.code}
                      </td>
                      <td className="admin-stores-td tabular-nums">
                        {formatUsd(card.initial_balance_usd)}
                      </td>
                      <td className="admin-stores-td tabular-nums">
                        {formatUsd(card.current_balance_usd)}
                      </td>
                      <td className="admin-stores-td">{statusLabel(card.status)}</td>
                      <td className="admin-stores-td admin-stores-td-muted">
                        {card.note || "—"}
                      </td>
                      <td className="admin-stores-td whitespace-nowrap">
                        {new Intl.DateTimeFormat("es-VE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(card.created_at))}
                      </td>
                      <td className="admin-stores-td">
                        {card.status === "depleted" ? (
                          <span className="admin-stores-td-muted">—</span>
                        ) : (
                          <button
                            type="button"
                            className="admin-stores-link"
                            disabled={busyId === card.id}
                            onClick={() => void handleToggle(card)}
                          >
                            {card.status === "active" ? "Desactivar" : "Activar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
