"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  Sparkles,
  Tag,
  X,
  RefreshCw,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyInventorySuggestionAction,
  dismissInventorySuggestionAction,
  refreshInventoryAiSuggestionsAction,
} from "@/lib/inventory-ai/actions";
import type {
  DiscountOfferPayload,
  InventoryAiSuggestionRow,
} from "@/lib/inventory-ai/types";
import { cn } from "@/lib/cn";

interface InventoryAiSuggestionCardsProps {
  initialSuggestions: InventoryAiSuggestionRow[];
  /** Compacto en catálogo; completo en /asistente */
  variant?: "compact" | "full";
  className?: string;
}

function discountLabel(payload: InventoryAiSuggestionRow["action_payload"]) {
  if (
    payload &&
    typeof payload === "object" &&
    "discountPercent" in payload &&
    typeof (payload as DiscountOfferPayload).discountPercent === "number"
  ) {
    return `${(payload as DiscountOfferPayload).discountPercent}%`;
  }
  return null;
}

function actionLabel(suggestion: InventoryAiSuggestionRow): string {
  if (suggestion.suggestion_type === "feature") {
    return "Destacar en catálogo";
  }
  const pct = discountLabel(suggestion.action_payload);
  return pct ? `Aplicar oferta ${pct}` : "Aplicar sugerencia";
}

export function InventoryAiSuggestionCards({
  initialSuggestions,
  variant = "compact",
  className,
}: InventoryAiSuggestionCardsProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, startTransition] = useTransition();

  function removeLocal(id: string) {
    setSuggestions((prev) => prev.filter((row) => row.id !== id));
  }

  function handleApply(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await applyInventorySuggestionAction(id);
      setBusyId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      removeLocal(id);
    });
  }

  function handleDismiss(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await dismissInventorySuggestionAction(id);
      setBusyId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      removeLocal(id);
    });
  }

  function handleRefresh() {
    setError(null);
    setRefreshing(true);
    startTransition(async () => {
      const result = await refreshInventoryAiSuggestionsAction();
      setRefreshing(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuggestions(result.suggestions ?? []);
    });
  }

  if (suggestions.length === 0 && variant === "compact") {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-teal-200/70 bg-teal-50/40 p-4 dark:border-teal-900/40 dark:bg-teal-950/20",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Asistente proactivo de inventario
              </h2>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                Productos sin movimiento (≥30 días). Tú apruebas cada cambio.
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || busyId != null}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Analizar ahora
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-white/70 px-3 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          No hay sugerencias pendientes. Cuando un producto lleve más de 30 días
          sin ventas, verás aquí una propuesta para reactivarlo.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => {
            const busy = busyId === suggestion.id;
            const Icon =
              suggestion.suggestion_type === "feature" ? Star : Tag;
            return (
              <li
                key={suggestion.id}
                className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {suggestion.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {suggestion.rationale}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      {suggestion.days_without_sale} días sin ventas · stock{" "}
                      {suggestion.available_stock}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="btn-brand"
                        disabled={busy || refreshing}
                        onClick={() => handleApply(suggestion.id)}
                      >
                        {busy ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {actionLabel(suggestion)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy || refreshing}
                        onClick={() => handleDismiss(suggestion.id)}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Descartar
                      </Button>
                      {variant === "full" ? (
                        <Link
                          href="/dashboard/catalogo"
                          className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                        >
                          Ver catálogo
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
