"use client";

import { Plus, Trash2 } from "lucide-react";
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

interface CatalogFaqFieldProps {
  value?: CatalogFaqSettings;
  onChange: (next: CatalogFaqSettings, shouldSave?: boolean) => void;
}

export function CatalogFaqField({ value, onChange }: CatalogFaqFieldProps) {
  const faq = normalizeCatalogFaqDraft(value ?? defaultCatalogFaqSettings());
  const canAdd = faq.items.length < MAX_CATALOG_FAQ_ITEMS;

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

      {faq.enabled ? (
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
