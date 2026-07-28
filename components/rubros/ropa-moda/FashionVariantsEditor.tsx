"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  ROPA_MODA_ALL_SIZE_PRESETS,
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_PANTS_SIZE_PRESETS,
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
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition sm:min-h-0 sm:px-2.5 sm:py-1 ${
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

function StockInput({
  value,
  onChange,
  disabled,
  required,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={
        className ??
        "min-h-10 w-full min-w-[3.25rem] rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm tabular-nums outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-950 sm:min-h-0 sm:w-20 sm:py-1.5"
      }
    />
  );
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
    <div className="space-y-4 rounded-xl border border-teal-200/70 bg-teal-50/40 p-3 sm:p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tallas y colores {required ? <span className="text-red-500">*</span> : null}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Ropa (S–XL), pantalones/jeans (28–36) o calzado (EUR / US). Cada
          combinación tiene su propio stock en la misma matriz.
          {combinationCount > 0
            ? ` · ${combinationCount} variante${combinationCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <div>
        <p className="label-field text-xs">Tallas</p>
        {renderSizeGroup("Ropa", ROPA_MODA_SIZE_PRESETS)}
        {renderSizeGroup("Pantalones / jeans", ROPA_MODA_PANTS_SIZE_PRESETS)}
        {renderSizeGroup("Calzado EUR", ROPA_MODA_SHOE_SIZE_EUR_PRESETS)}
        {renderSizeGroup("Calzado US", ROPA_MODA_SHOE_SIZE_US_PRESETS, customSizes)}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Otra talla (ej. 38, US 7.5, XXS)"
            maxLength={20}
            disabled={disabled}
            className="input-field mt-0 min-h-10 flex-1 py-2 text-sm sm:min-h-0"
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
            className="btn-secondary min-h-10 px-3 py-2 text-sm sm:min-h-0"
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
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Color personalizado"
            maxLength={30}
            disabled={disabled}
            className="input-field mt-0 min-h-10 flex-1 py-2 text-sm sm:min-h-0"
          />
          <button
            type="button"
            onClick={addCustomColor}
            disabled={disabled || !customColor.trim()}
            className="btn-secondary min-h-10 px-3 py-2 text-sm sm:min-h-0"
          >
            Añadir
          </button>
        </div>
      </div>

      {matrix.sizes.length > 0 && matrix.colors.length > 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {/* Móvil: tarjetas por talla, más fáciles de editar con el dedo */}
          <div className="space-y-3 p-3 sm:hidden">
            {matrix.sizes.map((size) => (
              <div
                key={size}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <p className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                  Talla {size}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {matrix.colors.map((color) => {
                    const key = fashionVariantKey(size, color);
                    return (
                      <label
                        key={key}
                        className="flex flex-col gap-1 rounded-md border border-zinc-200/80 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <span className="truncate text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                          {color}
                        </span>
                        <StockInput
                          value={matrix.stocks[key] ?? "0"}
                          onChange={(value) => setStock(size, color, value)}
                          disabled={disabled}
                          required={required}
                          ariaLabel={`Stock ${size} ${color}`}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/desktop: matriz cruzada con scroll y columna fija */}
          <div className="hidden overflow-x-auto overscroll-x-contain sm:block [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[20rem] border-collapse text-left text-xs">
              <thead className="bg-zinc-100/80 dark:bg-zinc-900">
                <tr>
                  <th className="sticky left-0 z-10 bg-zinc-100/95 px-3 py-2 font-semibold text-zinc-600 backdrop-blur-sm dark:bg-zinc-900/95 dark:text-zinc-300">
                    Talla \ Color
                  </th>
                  {matrix.colors.map((color) => (
                    <th
                      key={color}
                      className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-300"
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
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 font-medium text-zinc-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.35)]">
                      {size}
                    </td>
                    {matrix.colors.map((color) => {
                      const key = fashionVariantKey(size, color);
                      return (
                        <td key={key} className="px-2 py-1.5">
                          <StockInput
                            value={matrix.stocks[key] ?? "0"}
                            onChange={(value) => setStock(size, color, value)}
                            disabled={disabled}
                            required={required}
                            ariaLabel={`Stock ${size} ${color}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Indica cuántas unidades hay de cada talla y color. Usa 0 si esa
            combinación no está disponible.
          </p>
        </div>
      ) : null}
    </div>
  );
}
