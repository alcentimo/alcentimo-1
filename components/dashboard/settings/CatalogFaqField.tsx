"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATALOG_FAQ_ANSWER_MAX,
  CATALOG_FAQ_QUESTION_MAX,
  MAX_CATALOG_FAQ_ITEMS,
  createCatalogFaqItemId,
  defaultCatalogFaqSettings,
  normalizeCatalogFaqDraft,
} from "@/lib/store-settings/catalog-faq";
import type {
  CatalogFaqItem,
  CatalogFaqSettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface CatalogFaqFieldProps {
  value?: CatalogFaqSettings;
  onChange: (next: CatalogFaqSettings, shouldSave?: boolean) => void;
}

export function CatalogFaqField({ value, onChange }: CatalogFaqFieldProps) {
  const faq = normalizeCatalogFaqDraft(value ?? defaultCatalogFaqSettings());
  const canAdd = faq.items.length < MAX_CATALOG_FAQ_ITEMS;
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function emit(next: CatalogFaqSettings, shouldSave = true) {
    onChange(normalizeCatalogFaqDraft(next), shouldSave);
  }

  function setEnabled(enabled: boolean) {
    const items =
      enabled && faq.items.length === 0
        ? [
            {
              id: createCatalogFaqItemId(),
              question: "",
              answer: "",
            },
          ]
        : faq.items;
    emit({ enabled, items }, true);
  }

  function updateItem(
    itemId: string,
    patch: Partial<CatalogFaqItem>,
    shouldSave = true,
  ) {
    emit(
      {
        ...faq,
        items: faq.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      },
      shouldSave,
    );
  }

  function addItem() {
    if (!canAdd) return;
    emit(
      {
        ...faq,
        enabled: true,
        items: [
          ...faq.items,
          {
            id: createCatalogFaqItemId(),
            question: "",
            answer: "",
          },
        ],
      },
      true,
    );
  }

  function removeItem(itemId: string) {
    const items = faq.items.filter((item) => item.id !== itemId);
    emit(
      {
        enabled: items.length > 0 ? faq.enabled : false,
        items,
      },
      true,
    );
  }

  async function generateWithAi() {
    const hasContent = faq.items.some(
      (item) => item.question.trim() || item.answer.trim(),
    );
    if (hasContent) {
      const confirmed = window.confirm(
        "Esto reemplazará las preguntas actuales con sugerencias de IA. Podrás editarlas o borrarlas después. ¿Continuar?",
      );
      if (!confirmed) return;
    }

    setAiError(null);
    setGenerating(true);

    try {
      const response = await fetch(
        "/api/dashboard/settings/generate-catalog-faq",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        items?: Array<{ question?: string; answer?: string }>;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "No se pudieron generar las preguntas.",
        );
      }

      const items = (payload.items ?? [])
        .map((item) => ({
          id: createCatalogFaqItemId(),
          question: (item.question ?? "")
            .trim()
            .slice(0, CATALOG_FAQ_QUESTION_MAX),
          answer: (item.answer ?? "").trim().slice(0, CATALOG_FAQ_ANSWER_MAX),
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, MAX_CATALOG_FAQ_ITEMS);

      if (items.length === 0) {
        throw new Error("La IA no devolvió preguntas válidas.");
      }

      emit({ enabled: true, items }, true);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "No se pudieron generar las preguntas.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="design-faq-panel space-y-3">
      <div className="design-visibility-row">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Mostrar FAQ
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Al final del catálogo, estilo acordeón
          </p>
        </div>
        <SettingsSwitch
          id="catalog-faq-enabled"
          label="Mostrar preguntas frecuentes"
          checked={faq.enabled}
          onChange={setEnabled}
        />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void generateWithAi()}
          disabled={generating}
          className={cn(
            "design-faq-ai-btn",
            generating && "pointer-events-none opacity-70",
          )}
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {generating ? "Generando…" : "Sugerir preguntas con IA"}
        </button>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Usa el nombre, rubro, productos, categorías, envíos y pagos de tu
          tienda. Luego puedes editar o eliminar cada pregunta.
        </p>
        {aiError ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {aiError}
          </p>
        ) : null}
      </div>

      {faq.enabled || faq.items.length > 0 ? (
        <div className="design-faq-list space-y-3">
          {faq.items.map((item, index) => (
            <div key={item.id} className="design-faq-card space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Pregunta {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="design-faq-card-delete"
                  aria-label={`Eliminar pregunta ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div>
                <Label
                  htmlFor={`faq-q-${item.id}`}
                  className="payment-field-label"
                >
                  Pregunta
                </Label>
                <Input
                  id={`faq-q-${item.id}`}
                  value={item.question}
                  maxLength={CATALOG_FAQ_QUESTION_MAX}
                  placeholder="Ej: ¿Cuánto tarda el envío?"
                  className="payment-field-input mt-1"
                  onChange={(event) =>
                    updateItem(
                      item.id,
                      {
                        question: event.target.value.slice(
                          0,
                          CATALOG_FAQ_QUESTION_MAX,
                        ),
                      },
                      false,
                    )
                  }
                  onBlur={(event) =>
                    updateItem(
                      item.id,
                      {
                        question: event.target.value.slice(
                          0,
                          CATALOG_FAQ_QUESTION_MAX,
                        ),
                      },
                      true,
                    )
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor={`faq-a-${item.id}`}
                  className="payment-field-label"
                >
                  Respuesta
                </Label>
                <Textarea
                  id={`faq-a-${item.id}`}
                  value={item.answer}
                  maxLength={CATALOG_FAQ_ANSWER_MAX}
                  rows={3}
                  placeholder="Ej: Enviamos en 24–48 horas hábiles dentro de Caracas."
                  className="payment-field-input mt-1"
                  onChange={(event) =>
                    updateItem(
                      item.id,
                      {
                        answer: event.target.value.slice(
                          0,
                          CATALOG_FAQ_ANSWER_MAX,
                        ),
                      },
                      false,
                    )
                  }
                  onBlur={(event) =>
                    updateItem(
                      item.id,
                      {
                        answer: event.target.value.slice(
                          0,
                          CATALOG_FAQ_ANSWER_MAX,
                        ),
                      },
                      true,
                    )
                  }
                />
              </div>
            </div>
          ))}

          {canAdd ? (
            <button
              type="button"
              onClick={addItem}
              className="design-faq-add-btn"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Agregar pregunta
            </button>
          ) : (
            <p className="text-[11px] text-zinc-400">
              Máximo {MAX_CATALOG_FAQ_ITEMS} preguntas.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
