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
  const isExpanded = variants.length > 0;

  function updateVariant(index: number, patch: Partial<VariantFormInput>) {
    onChange(variants.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addVariant() {
    onChange([...variants, emptyVariant()]);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  if (!isExpanded) {
    return (
      <div>
        <button
          type="button"
          onClick={addVariant}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition hover:text-teal-800 disabled:opacity-60 dark:text-teal-400 dark:hover:text-teal-300"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar variante
        </button>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Opcional. Solo si vendes el mismo producto en distintas opciones (tamaño, color, presentación, etc.).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-field mb-0">Variantes</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Cada variante puede tener precio extra y stock propio.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          disabled={disabled}
          className="btn-secondary mt-2 gap-1.5 self-start sm:mt-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar otra
        </button>
      </div>

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
                maxLength={80}
                value={variant.name}
                onChange={(e) => updateVariant(index, { name: e.target.value })}
                placeholder="Ej: Grande, Rojo, 500 ml"
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
    </div>
  );
}

export function serializeVariantsForForm(
  variants: VariantFormInput[],
  existingIds?: string[],
): string {
  const rows: Array<{
    id?: string;
    name: string;
    priceExtraUsd: string;
    stock: string;
    attributes?: Record<string, string>;
  }> = [];

  variants.forEach((row, index) => {
    const name = row.name.trim();
    if (!name) return;

    rows.push({
      id: row.id ?? existingIds?.[index],
      name,
      priceExtraUsd: row.priceExtraUsd,
      stock: row.stock,
      attributes: row.attributes,
    });
  });

  return JSON.stringify(rows);
}
