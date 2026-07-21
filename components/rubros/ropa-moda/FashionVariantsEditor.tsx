"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  ROPA_MODA_ALL_SIZE_PRESETS,
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_SHOE_SIZE_EUR_PRESETS,
  ROPA_MODA_SHOE_SIZE_US_PRESETS,
  ROPA_MODA_SIZE_PRESETS,
  createDefaultFashionMatrix,
  fashionMatrixToVariants,
  fashionVariantKey,
  variantsToFashionMatrix,
  type FashionMatrixState,
} from "@/lib/rubros/modules/ropa-moda";

interface FashionVariantsEditorProps {
  variants: VariantFormInput[];
  onChange: (variants: VariantFormInput[]) => void;
  disabled?: boolean;
  /** Obliga tallas/colores (estándar Ropa y Moda). */
  required?: boolean;
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

function resolveInitialMatrix(variants: VariantFormInput[]): FashionMatrixState {
  if (variants.length > 0) return variantsToFashionMatrix(variants);
  return createDefaultFashionMatrix();
}

function sizeEquals(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hasSize(sizes: string[], candidate: string): boolean {
  return sizes.some((size) => sizeEquals(size, candidate));
}

export function FashionVariantsEditor({
  variants,
  onChange,
  disabled = false,
  required = true,
}: FashionVariantsEditorProps) {
  const [matrix, setMatrix] = useState<FashionMatrixState>(() =>
    resolveInitialMatrix(variants),
  );
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const didSeedRef = useRef(false);

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

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (variants.length === 0) {
      commit(createDefaultFashionMatrix());
    }
    // Solo al montar: sincroniza el estado del padre con la matriz por defecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSize(size: string) {
    const exists = hasSize(matrix.sizes, size);
    if (exists && required && matrix.sizes.length <= 1) return;
    const sizes = exists
      ? matrix.sizes.filter((item) => !sizeEquals(item, size))
      : [...matrix.sizes, size.trim()];
    commit({ ...matrix, sizes });
  }

  function toggleColor(color: string) {
    const exists = matrix.colors.includes(color);
    if (exists && required && matrix.colors.length <= 1) return;
    const colors = exists
      ? matrix.colors.filter((item) => item !== color)
      : [...matrix.colors, color];
    commit({ ...matrix, colors });
  }

  function addCustomSize() {
    const value = customSize.trim();
    if (!value || hasSize(matrix.sizes, value)) return;
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

  const customSizes = useMemo(
    () =>
      matrix.sizes.filter(
        (size) =>
          !(ROPA_MODA_ALL_SIZE_PRESETS as readonly string[]).some((preset) =>
            sizeEquals(preset, size),
          ),
      ),
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

  function renderSizeGroup(
    title: string,
    presets: readonly string[],
    extra: string[] = [],
  ) {
    const items = [...presets, ...extra];
    if (items.length === 0) return null;

    return (
      <div className="mt-2">
        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((size) => (
            <ChipToggle
              key={size}
              label={size}
              active={hasSize(matrix.sizes, size)}
              onClick={() => toggleSize(size)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-teal-200/70 bg-teal-50/40 p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tallas y colores {required ? <span className="text-red-500">*</span> : null}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ropa (S–XL) o calzado (EUR / US). Cada combinación tiene su propio
          stock en la misma matriz.
          {combinationCount > 0
            ? ` · ${combinationCount} variante${combinationCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <div>
        <p className="label-field text-xs">Tallas</p>
        {renderSizeGroup("Ropa", ROPA_MODA_SIZE_PRESETS)}
        {renderSizeGroup("Calzado EUR", ROPA_MODA_SHOE_SIZE_EUR_PRESETS)}
        {renderSizeGroup("Calzado US", ROPA_MODA_SHOE_SIZE_US_PRESETS, customSizes)}
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Otra talla (ej. 38.5, US 7.5, XXS)"
            maxLength={20}
            disabled={disabled}
            className="input-field mt-0 flex-1 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSize();
              }
            }}
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
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
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
                          required={required}
                          value={matrix.stocks[key] ?? "0"}
                          onChange={(e) => setStock(size, color, e.target.value)}
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
            Indica cuántas unidades hay de cada talla y color. Usa 0 si esa
            combinación no está disponible.
          </p>
        </div>
      ) : null}
    </div>
  );
}
