"use client";

import { Plus, Trash2 } from "lucide-react";
import type { VariantFormInput } from "@/lib/products/variants";

interface ProductVariantsEditorProps {
  variants: VariantFormInput[];
  onChange: (variants: VariantFormInput[]) => void;
  disabled?: boolean;
}

function emptyVariant(): VariantFormInput {
  return { name: "", priceExtraUsd: "0", stock: "0" };
}

export function ProductVariantsEditor({
  variants,
  onChange,
  disabled = false,
}: ProductVariantsEditorProps) {
  function updateVariant(index: number, patch: Partial<VariantFormInput>) {
    onChange(variants.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addVariant() {
    onChange([...variants, emptyVariant()]);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-field mb-0">Variantes (opcional)</p>
          <p className="mt-1 text-xs text-zinc-500">
            Ej: tallas o colores con precio extra y stock individual.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          disabled={disabled}
          className="btn-secondary mt-2 gap-1.5 self-start sm:mt-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar variante
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700">
          Sin variantes: se usará el stock y precio base del producto.
        </p>
      ) : (
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:grid-cols-[1fr_7rem_7rem_auto] dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div>
                <label className="label-field text-xs">Nombre</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={variant.name}
                  onChange={(e) => updateVariant(index, { name: e.target.value })}
                  placeholder="Ej: Talla M"
                  disabled={disabled}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="label-field text-xs">Precio extra USD</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={variant.priceExtraUsd}
                  onChange={(e) =>
                    updateVariant(index, { priceExtraUsd: e.target.value })
                  }
                  disabled={disabled}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="label-field text-xs">Stock</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, { stock: e.target.value })}
                  disabled={disabled}
                  className="input-field mt-1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={disabled}
                  className="btn-secondary px-3 py-2.5 text-red-600 hover:text-red-700"
                  aria-label={`Quitar variante ${variant.name || index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function serializeVariantsForForm(
  variants: VariantFormInput[],
  existingIds?: string[],
): string {
  return JSON.stringify(
    variants.map((row, index) => ({
      id: existingIds?.[index],
      name: row.name.trim(),
      priceExtraUsd: row.priceExtraUsd,
      stock: row.stock,
    })),
  );
}
