"use client";

import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXAMPLE_PROMPTS = [
  "¿Cuántas tiendas activas hay por plan?",
  "Resume los pagos pendientes de esta semana.",
  "¿Qué usuarios están cerca del límite de productos?",
  "Compara ingresos verificados vs. mes anterior.",
] as const;

/** Placeholder para futuro asistente IA gerencial del admin. */
export function AdminAiAssistantPanel() {
  return (
    <section className="admin-ai-panel" aria-labelledby="admin-ai-title">
      <div className="admin-ai-panel-header">
        <div className="flex items-center gap-2">
          <span className="admin-ai-panel-icon" aria-hidden="true">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3
              id="admin-ai-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Asistente IA administrativo
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Consultas en lenguaje natural sobre métricas globales del SaaS.
            </p>
          </div>
        </div>
        <span className="admin-ai-panel-badge">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Próximamente
        </span>
      </div>

      <div className="admin-ai-panel-body">
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Aquí podrás pedir resúmenes operativos, detectar anomalías en pagos,
          comparar planes y obtener recomendaciones de crecimiento sin salir del
          panel.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
            >
              “{prompt}”
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            disabled
            placeholder="Pregunta sobre métricas, tiendas o ingresos…"
            className="admin-ai-panel-input"
            aria-label="Consulta para el asistente IA (próximamente)"
          />
          <Button type="button" disabled className="shrink-0 opacity-60">
            Consultar IA
          </Button>
        </div>
      </div>
    </section>
  );
}
