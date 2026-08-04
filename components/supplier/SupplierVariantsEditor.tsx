"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  SUPPLIER_VARIANT_ATTRIBUTES,
  emptySupplierVariants,
  type SupplierProductVariants,
  type SupplierVariantAttribute,
} from "@/lib/supplier/variants";

interface SupplierVariantsEditorProps {
  idPrefix: string;
  value: SupplierProductVariants;
  disabled?: boolean;
  onChange: (next: SupplierProductVariants) => void;
}

export function SupplierVariantsEditor({
  idPrefix,
  value,
  disabled = false,
  onChange,
}: SupplierVariantsEditorProps) {
  const variants = value.options.length || value.attribute
    ? value
    : emptySupplierVariants();

  function updateAttribute(attribute: SupplierVariantAttribute) {
    onChange({
      ...variants,
      attribute,
      attributeLabel:
        attribute === "otro" ? variants.attributeLabel ?? "" : undefined,
    });
  }

  function addOption() {
    onChange({
      ...variants,
      options: [
        ...variants.options,
        { id: crypto.randomUUID(), label: "" },
      ],
    });
  }

  function updateOption(
    optionId: string,
    patch: { label?: string; priceExtraUsd?: string },
  ) {
    onChange({
      ...variants,
      options: variants.options.map((option) => {
        if (option.id !== optionId) return option;
        const next = { ...option };
        if (patch.label != null) next.label = patch.label;
        if (patch.priceExtraUsd != null) {
          const parsed = Number(patch.priceExtraUsd.replace(",", "."));
          if (!patch.priceExtraUsd.trim() || !Number.isFinite(parsed)) {
            delete next.priceExtraUsd;
          } else {
            next.priceExtraUsd = parsed;
          }
        }
        return next;
      }),
    });
  }

  function removeOption(optionId: string) {
    onChange({
      ...variants,
      options: variants.options.filter((option) => option.id !== optionId),
    });
  }

  function clearVariants() {
    onChange(emptySupplierVariants());
  }

  return (
    <div className="supplier-hub-soft-panel space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="supplier-hub-section-label">Variantes (opcional)</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Color, modelo o presentación en una sola ficha, sin duplicar el
            producto.
          </p>
        </div>
        {variants.options.length > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 hover:text-red-600"
            onClick={clearVariants}
            disabled={disabled}
          >
            Quitar variantes
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-attr`} className="label-field">
            Tipo de atributo
          </label>
          <select
            id={`${idPrefix}-attr`}
            className="input-field"
            value={variants.attribute}
            disabled={disabled}
            onChange={(event) =>
              updateAttribute(event.target.value as SupplierVariantAttribute)
            }
          >
            {SUPPLIER_VARIANT_ATTRIBUTES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {variants.attribute === "otro" ? (
          <div>
            <label htmlFor={`${idPrefix}-attr-label`} className="label-field">
              Nombre del atributo
            </label>
            <input
              id={`${idPrefix}-attr-label`}
              className="input-field"
              value={variants.attributeLabel ?? ""}
              placeholder="Ej: Talla"
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...variants,
                  attributeLabel: event.target.value,
                })
              }
            />
          </div>
        ) : null}
      </div>

      {variants.options.length === 0 ? (
        <button
          type="button"
          className="btn-brand-outline !min-h-9 !px-3 !text-xs"
          onClick={addOption}
          disabled={disabled}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Añadir variante
        </button>
      ) : (
        <ul className="space-y-2">
          {variants.options.map((option, index) => (
            <li
              key={option.id}
              className="flex flex-wrap items-end gap-2 rounded-xl border border-emerald-100/80 bg-white p-2.5 dark:border-emerald-900/40 dark:bg-zinc-950"
            >
              <div className="min-w-[8rem] flex-1">
                <label
                  htmlFor={`${idPrefix}-opt-${option.id}`}
                  className="label-field"
                >
                  Opción {index + 1}
                </label>
                <input
                  id={`${idPrefix}-opt-${option.id}`}
                  className="input-field"
                  value={option.label}
                  placeholder="Ej: Rojo, 500 ml, Pro…"
                  disabled={disabled}
                  onChange={(event) =>
                    updateOption(option.id, { label: event.target.value })
                  }
                />
              </div>
              <div className="w-28">
                <label
                  htmlFor={`${idPrefix}-extra-${option.id}`}
                  className="label-field"
                >
                  Extra USD
                </label>
                <input
                  id={`${idPrefix}-extra-${option.id}`}
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={
                    option.priceExtraUsd != null
                      ? String(option.priceExtraUsd)
                      : ""
                  }
                  placeholder="0"
                  disabled={disabled}
                  onChange={(event) =>
                    updateOption(option.id, {
                      priceExtraUsd: event.target.value,
                    })
                  }
                />
              </div>
              <button
                type="button"
                className="btn-brand-outline !min-h-10 !px-2.5 !text-xs"
                aria-label="Eliminar opción"
                disabled={disabled}
                onClick={() => removeOption(option.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {variants.options.length > 0 ? (
        <button
          type="button"
          className="btn-brand-outline !min-h-9 !px-3 !text-xs"
          onClick={addOption}
          disabled={disabled || variants.options.length >= 40}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Otra opción
        </button>
      ) : null}
    </div>
  );
}
