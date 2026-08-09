"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles, Tag, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyMarketingSuggestionAction,
  dismissMarketingSuggestionAction,
  refreshMarketingAiSuggestionsAction,
} from "@/lib/marketing-ai/actions";
import type { MarketingAiSuggestionRow } from "@/lib/marketing-ai/types";
import { cn } from "@/lib/cn";

interface MarketingAiSuggestionCardsProps {
  initialSuggestions: MarketingAiSuggestionRow[];
  variant?: "compact" | "full";
  className?: string;
}

function previewLabel(suggestion: MarketingAiSuggestionRow): string {
  const payload = suggestion.action_payload as unknown as Record<
    string,
    unknown
  >;
  const code = typeof payload.code === "string" ? payload.code : "—";
  if (suggestion.suggestion_type === "create_fixed_coupon") {
    const amount = Number(payload.discountFixedUsd) || 0;
    return `${code} · $${amount.toFixed(2)}`;
  }
  const pct =
    Number(payload.discountPercent ?? payload.discountPercentage) || 0;
  return `${code} · ${pct}%`;
}

function applyLabel(suggestion: MarketingAiSuggestionRow): string {
  if (suggestion.suggestion_type === "create_customer_promo") {
    return "Activar promo de clientes";
  }
  if (suggestion.suggestion_type === "combo_bundle") {
    return "Activar cupón de combo";
  }
  return "Activar cupón";
}

export function MarketingAiSuggestionCards({
  initialSuggestions,
  variant = "full",
  className,
}: MarketingAiSuggestionCardsProps) {
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
      const result = await applyMarketingSuggestionAction(id);
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
      const result = await dismissMarketingSuggestionAction(id);
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
      const result = await refreshMarketingAiSuggestionsAction();
      setRefreshing(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuggestions(result.suggestions ?? []);
    });
  }

  if (variant === "compact" && suggestions.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-zinc-950",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Sugerencias de IA
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Promociones recomendadas para tu tienda
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Basadas en ventas, stock lento y clientes de una sola compra. Tú
            decides cuáles activar.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          Analizar ahora
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-emerald-200/80 bg-white/70 px-3 py-4 text-sm text-zinc-600 dark:border-emerald-900/40 dark:bg-zinc-950/40 dark:text-zinc-400">
          Aún no hay sugerencias pendientes. Pulsa{" "}
          <strong>Analizar ahora</strong> para generar recomendaciones con la IA
          de Alcéntimo.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => {
            const busy = busyId === suggestion.id;
            return (
              <li
                key={suggestion.id}
                className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <Tag className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {suggestion.title}
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {previewLabel(suggestion)}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {suggestion.rationale}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleApply(suggestion.id)}
                      >
                        {busy ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                        {applyLabel(suggestion)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => handleDismiss(suggestion.id)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Descartar
                      </Button>
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
