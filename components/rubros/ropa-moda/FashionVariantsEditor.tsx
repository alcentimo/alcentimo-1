"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_SIZE_PRESETS,
  emptyFashionMatrix,
  fashionMatrixToVariants,
  fashionVariantKey,
  variantsToFashionMatrix,
  type FashionMatrixState,
} from "@/lib/rubros/modules/ropa-moda";

interface FashionVariantsEditorProps {
  variants: VariantFormInput[];
  onChange: (variants: VariantFormInput[]) => void;
  disabled?: boolean;
}

function ChipToggle({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-teal-600 bg-teal-600 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

export function FashionVariantsEditor({
  variants,
  onChange,
  disabled = false,
}: FashionVariantsEditorProps) {
  const [matrix, setMatrix] = useState<FashionMatrixState>(() =>
    variants.length > 0 ? variantsToFashionMatrix(variants) : emptyFashionMatrix(),
  );
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");

  const combinationCount = matrix.sizes.length * matrix.colors.length;

  function commit(next: FashionMatrixState) {
    const stocks = { ...next.stocks };
    const priceExtras = { ...next.priceExtras };
    const ids = { ...next.ids };
    const activeKeys = new Set<string>();

    for (const size of next.sizes) {
      for (const color of next.colors) {
        const key = fashionVariantKey(size, color);
        activeKeys.add(key);
        if (stocks[key] == null) stocks[key] = "0";
        if (priceExtras[key] == null) priceExtras[key] = "0";
      }
    }

    for (const key of Object.keys(stocks)) {
      if (!activeKeys.has(key)) {
        delete stocks[key];
        delete priceExtras[key];
        delete ids[key];
      }
    }

    const normalized = { ...next, stocks, priceExtras, ids };
    setMatrix(normalized);
    onChange(fashionMatrixToVariants(normalized));
  }

  function toggleSize(size: string) {
    const exists = matrix.sizes.includes(size);
    const sizes = exists
      ? matrix.sizes.filter((item) => item !== size)
      : [...matrix.sizes, size];
    commit({ ...matrix, sizes });
  }

  function toggleColor(color: string) {
    const exists = matrix.colors.includes(color);
    const colors = exists
      ? matrix.colors.filter((item) => item !== color)
      : [...matrix.colors, color];
    commit({ ...matrix, colors });
  }

  function addCustomSize() {
    const value = customSize.trim();
    if (!value || matrix.sizes.includes(value)) return;
    setCustomSize("");
    commit({ ...matrix, sizes: [...matrix.sizes, value] });
  }

  function addCustomColor() {
    const value = customColor.trim();
    if (!value || matrix.colors.includes(value)) return;
    setCustomColor("");
    commit({ ...matrix, colors: [...matrix.colors, value] });
  }

  function setStock(size: string, color: string, stock: string) {
    const key = fashionVariantKey(size, color);
    commit({
      ...matrix,
      stocks: { ...matrix.stocks, [key]: stock },
    });
  }

  function clearMatrix() {
    commit(emptyFashionMatrix());
  }

  function seedDefaultMatrix() {
    commit({
      sizes: ["S", "M", "L"],
      colors: ["Negro", "Blanco"],
      stocks: {
        [fashionVariantKey("S", "Negro")]: "0",
        [fashionVariantKey("S", "Blanco")]: "0",
        [fashionVariantKey("M", "Negro")]: "0",
        [fashionVariantKey("M", "Blanco")]: "0",
        [fashionVariantKey("L", "Negro")]: "0",
        [fashionVariantKey("L", "Blanco")]: "0",
      },
      priceExtras: {},
      ids: {},
    });
  }

  const sizePresets = useMemo(
    () => [
      ...ROPA_MODA_SIZE_PRESETS,
      ...matrix.sizes.filter(
        (size) =>
          !(ROPA_MODA_SIZE_PRESETS as readonly string[]).includes(size),
      ),
    ],
    [matrix.sizes],
  );

  const colorPresets = useMemo(
    () => [
      ...ROPA_MODA_COLOR_PRESETS,
      ...matrix.colors.filter(
        (color) =>
          !(ROPA_MODA_COLOR_PRESETS as readonly string[]).includes(color),
      ),
    ],
    [matrix.colors],
  );

  if (matrix.sizes.length === 0 && matrix.colors.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Variantes de ropa (talla × color)
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Define tallas y colores con stock individual. Solo se carga para tiendas de Ropa y
          Moda.
        </p>
        <button
          type="button"
          onClick={seedDefaultMatrix}
          disabled={disabled}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition hover:text-teal-800 disabled:opacity-60 dark:text-teal-400"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Configurar tallas y colores
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Variantes de ropa (talla × color)
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {combinationCount > 0
              ? `${combinationCount} combinación${combinationCount === 1 ? "" : "es"} · stock por celda`
              : "Selecciona al menos una talla y un color"}
          </p>
        </div>
        <button
          type="button"
          onClick={clearMatrix}
          disabled={disabled}
          className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:opacity-50"
        >
          Quitar variantes
        </button>
      </div>

      <div>
        <p className="label-field text-xs">Tallas</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sizePresets.map((size) => (
            <ChipToggle
              key={size}
              label={size}
              active={matrix.sizes.includes(size)}
              onClick={() => toggleSize(size)}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Talla personalizada"
            maxLength={20}
            disabled={disabled}
            className="input-field mt-0 flex-1 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustomSize}
            disabled={disabled || !customSize.trim()}
            className="btn-secondary px-3 py-2 text-sm"
          >
            Añadir
          </button>
        </div>
      </div>

      <div>
        <p className="label-field text-xs">Colores</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {colorPresets.map((color) => (
            <ChipToggle
              key={color}
              label={color}
              active={matrix.colors.includes(color)}
              onClick={() => toggleColor(color)}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Color personalizado"
            maxLength={30}
            disabled={disabled}
            className="input-field mt-0 flex-1 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCustomColor}
            disabled={disabled || !customColor.trim()}
            className="btn-secondary px-3 py-2 text-sm"
          >
            Añadir
          </button>
        </div>
      </div>

      {matrix.sizes.length > 0 && matrix.colors.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-100/80 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-300">
                  Talla \ Color
                </th>
                {matrix.colors.map((color) => (
                  <th
                    key={color}
                    className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-300"
                  >
                    {color}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.sizes.map((size) => (
                <tr
                  key={size}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-100">
                    {size}
                  </td>
                  {matrix.colors.map((color) => {
                    const key = fashionVariantKey(size, color);
                    return (
                      <td key={key} className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={matrix.stocks[key] ?? ""}
                          onChange={(e) => setStock(size, color, e.target.value)}
                          placeholder="—"
                          disabled={disabled}
                          aria-label={`Stock ${size} ${color}`}
                          className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Deja vacío o pon 0 si esa combinación no aplica. Solo las celdas con valor se
            guardan como variantes.
          </p>
        </div>
      ) : null}

      {matrix.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {matrix.sizes.map((size) => (
            <button
              key={`rm-size-${size}`}
              type="button"
              onClick={() => toggleSize(size)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md text-[11px] text-zinc-500 hover:text-red-600"
              aria-label={`Quitar talla ${size}`}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              {size}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
