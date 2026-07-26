"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { AnalyticsDateRange } from "@/lib/analytics/types";

interface AnalyticsAiInsightBlockProps {
  dateRange: AnalyticsDateRange;
}

export function AnalyticsAiInsightBlock({ dateRange }: AnalyticsAiInsightBlockProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsight = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/analytics/generate-insight", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          range: dateRange.preset,
          from: dateRange.from,
          to: dateRange.to,
        }),
      });

      const payload = (await response.json()) as {
        insight?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo generar el análisis.");
      }

      if (!payload.insight?.trim()) {
        throw new Error("La IA no devolvió un análisis válido.");
      }

      setInsight(payload.insight.trim());
    } catch (loadError) {
      setInsight(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Error al generar el análisis.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.preset, dateRange.to]);

  useEffect(() => {
    void loadInsight();
  }, [loadInsight]);

  return (
    <section className="analytics-ai-insight" aria-live="polite">
      <div className="analytics-ai-insight-header">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <div>
            <h2 className="analytics-ai-insight-title">
              Análisis Inteligente del Negocio (IA)
            </h2>
            <p className="analytics-ai-insight-desc">
              Resumen en lenguaje sencillo para {dateRange.label.toLowerCase()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadInsight()}
          disabled={loading}
          className="analytics-ai-insight-refresh"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="analytics-ai-insight-loading">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" aria-hidden="true" />
          <p>Analizando tus ventas y movimiento del periodo…</p>
        </div>
      ) : error ? (
        <p className="analytics-ai-insight-error" role="alert">
          {error}
        </p>
      ) : insight ? (
        <p className="analytics-ai-insight-text">{insight}</p>
      ) : null}
    </section>
  );
}
