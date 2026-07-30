"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  FASHION_PRODUCT_KIND_OPTIONS,
  ROPA_MODA_ALL_SIZE_PRESETS,
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_PANTS_SIZE_PRESETS,
  ROPA_MODA_SHOE_SIZE_EUR_PRESETS,
  ROPA_MODA_SHOE_SIZE_US_PRESETS,
  ROPA_MODA_SIZE_PRESETS,
  createDefaultFashionMatrix,
  fashionMatrixToVariants,
  fashionVariantKey,
  filterSizesForFashionKind,
  getDefaultShoeLengthCm,
  inferFashionProductKind,
  isFashionShoeSize,
  variantsToFashionMatrix,
  type FashionMatrixState,
  type FashionProductKind,
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

function resolveInitialMatrix(
  variants: VariantFormInput[],
  kind: FashionProductKind,
): FashionMatrixState {
  if (variants.length > 0) return variantsToFashionMatrix(variants);
  return createDefaultFashionMatrix(kind);
}

function sizeEquals(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hasSize(sizes: string[], candidate: string): boolean {
  return sizes.some((size) => sizeEquals(size, candidate));
}

/** Asegura cm sugeridos para tallas de calzado recién añadidas. */
function withShoeLengthDefaults(
  next: FashionMatrixState,
): FashionMatrixState {
  const sizeLengthCm = { ...(next.sizeLengthCm ?? {}) };

  for (const key of Object.keys(sizeLengthCm)) {
    const stillActive = next.sizes.some(
      (size) => sizeEquals(size, key) && isFashionShoeSize(size),
    );
    if (!stillActive) delete sizeLengthCm[key];
  }

  for (const size of next.sizes) {
    if (!isFashionShoeSize(size)) continue;
    // Solo sugerir si la talla es nueva (clave ausente); respeta vacío del usuario.
    if (Object.prototype.hasOwnProperty.call(sizeLengthCm, size)) continue;
    sizeLengthCm[size] = getDefaultShoeLengthCm(size) ?? "";
  }

  return { ...next, sizeLengthCm };
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

function kindDescription(kind: FashionProductKind): string {
  if (kind === "calzado") {
    return "Numeraciones EUR o US y colores. Cada combinación tiene su propio stock.";
  }
  if (kind === "ambos") {
    return "Ropa (S–XL), pantalones/jeans (28–36) y calzado (EUR / US) en la misma matriz.";
  }
  return "Tallas de prenda (S–XL), pantalones/jeans (28–36) y colores.";
}

export function FashionVariantsEditor({
  variants,
  onChange,
  disabled = false,
  required = true,
}: FashionVariantsEditorProps) {
  const initialKind = useMemo(() => {
    if (variants.length === 0) return "ropa" as FashionProductKind;
    return inferFashionProductKind(
      variantsToFashionMatrix(variants).sizes,
    );
  }, [variants]);

  const [productKind, setProductKind] =
    useState<FashionProductKind>(initialKind);
  const [matrix, setMatrix] = useState<FashionMatrixState>(() =>
    resolveInitialMatrix(variants, initialKind),
  );
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const didSeedRef = useRef(false);

  const showClothingSizes = productKind === "ropa" || productKind === "ambos";
  const showShoeSizes = productKind === "calzado" || productKind === "ambos";

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

    const normalized = withShoeLengthDefaults({
      ...next,
      stocks,
      priceExtras,
      ids,
      sizeLengthCm: next.sizeLengthCm ?? {},
    });
    setMatrix(normalized);
    onChange(fashionMatrixToVariants(normalized));
  }

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (variants.length === 0) {
      commit(createDefaultFashionMatrix(productKind));
    }
    // Solo al montar: sincroniza el estado del padre con la matriz por defecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProductKindChange(nextKind: FashionProductKind) {
    if (nextKind === productKind) return;

    const filteredSizes = filterSizesForFashionKind(matrix.sizes, nextKind);
    const defaults = createDefaultFashionMatrix(nextKind);
    const sizes =
      filteredSizes.length > 0 ? filteredSizes : defaults.sizes;
    const colors =
      matrix.colors.length > 0 ? matrix.colors : defaults.colors;

    setProductKind(nextKind);
    commit({
      ...matrix,
      sizes,
      colors,
      sizeLengthCm: nextKind === "ropa" ? {} : matrix.sizeLengthCm,
    });
  }

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

    // Evita mezclar tipos de talla fuera del modo "Ambos".
    if (productKind === "ropa" && isFashionShoeSize(value)) return;
    if (productKind === "calzado" && !isFashionShoeSize(value)) return;

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

  function setSizeLengthCm(size: string, cm: string) {
    commit({
      ...matrix,
      sizeLengthCm: {
        ...(matrix.sizeLengthCm ?? {}),
        [size]: cm,
      },
    });
  }

  const selectedShoeSizes = useMemo(
    () => matrix.sizes.filter((size) => isFashionShoeSize(size)),
    [matrix.sizes],
  );

  const clothingCustomSizes = useMemo(
    () =>
      matrix.sizes.filter(
        (size) =>
          !isFashionShoeSize(size) &&
          !(ROPA_MODA_ALL_SIZE_PRESETS as readonly string[]).some((preset) =>
            sizeEquals(preset, size),
          ),
      ),
    [matrix.sizes],
  );

  const shoeCustomSizes = useMemo(
    () =>
      matrix.sizes.filter(
        (size) =>
          isFashionShoeSize(size) &&
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

  const customSizePlaceholder =
    productKind === "calzado"
      ? "Otra talla (ej. EUR 38.5, US 7.5)"
      : productKind === "ropa"
        ? "Otra talla (ej. XXS, 3XL)"
        : "Otra talla (ej. EUR 38.5, US 7.5, XXS)";

  return (
    <div className="space-y-4 rounded-xl border border-teal-200/70 bg-teal-50/40 p-3 sm:p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tallas y colores {required ? <span className="text-red-500">*</span> : null}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {kindDescription(productKind)}
          {combinationCount > 0
            ? ` · ${combinationCount} variante${combinationCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="label-field text-xs">Tipo de producto</legend>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Tipo de producto"
        >
          {FASHION_PRODUCT_KIND_OPTIONS.map((option) => {
            const active = productKind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleProductKindChange(option.value)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    active ? "text-teal-50/90" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="label-field text-xs">Tallas</p>
        {showClothingSizes ? (
          <>
            {renderSizeGroup(
              "Ropa",
              ROPA_MODA_SIZE_PRESETS,
              clothingCustomSizes,
            )}
            {renderSizeGroup("Pantalones / jeans", ROPA_MODA_PANTS_SIZE_PRESETS)}
          </>
        ) : null}
        {showShoeSizes ? (
          <>
            {renderSizeGroup("Calzado EUR", ROPA_MODA_SHOE_SIZE_EUR_PRESETS)}
            {renderSizeGroup(
              "Calzado US",
              ROPA_MODA_SHOE_SIZE_US_PRESETS,
              shoeCustomSizes,
            )}
          </>
        ) : null}

        {showShoeSizes ? (
          selectedShoeSizes.length > 0 ? (
            <div className="mt-3 rounded-lg border border-teal-200/60 bg-white/80 p-3 dark:border-teal-900/40 dark:bg-zinc-950/50">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                Guía de centímetros (calzado)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Longitud del pie / plantilla interna en cm. Valores orientativos;
                ajústalos según la marca. Se guarda en cada variante de esa talla.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {selectedShoeSizes.map((size) => {
                  const suggested = getDefaultShoeLengthCm(size);
                  const value =
                    matrix.sizeLengthCm?.[size] ?? suggested ?? "";
                  return (
                    <label
                      key={size}
                      className="flex flex-col gap-1 rounded-md border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/40"
                    >
                      <span className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                        {size}
                        {suggested ? (
                          <span className="font-normal text-zinc-400">
                            {" "}
                            · ref. {suggested} cm
                          </span>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          max={50}
                          step={0.1}
                          value={value}
                          onChange={(e) => setSizeLengthCm(size, e.target.value)}
                          disabled={disabled}
                          aria-label={`Centímetros talla ${size}`}
                          className="min-h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 dark:border-zinc-700 dark:bg-zinc-950 sm:min-h-0"
                        />
                        <span className="shrink-0 text-[11px] text-zinc-500">
                          cm
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Al elegir tallas de calzado (EUR / US) podrás indicar la equivalencia
              en centímetros de cada una.
            </p>
          )
        ) : null}

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder={customSizePlaceholder}
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
                  {isFashionShoeSize(size) &&
                  (matrix.sizeLengthCm?.[size] ||
                    getDefaultShoeLengthCm(size)) ? (
                    <span className="ml-1 font-normal text-zinc-500">
                      (
                      {matrix.sizeLengthCm?.[size] ||
                        getDefaultShoeLengthCm(size)}{" "}
                      cm)
                    </span>
                  ) : null}
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
                      {isFashionShoeSize(size) &&
                      (matrix.sizeLengthCm?.[size] ||
                        getDefaultShoeLengthCm(size)) ? (
                        <span className="ml-1 text-[10px] font-normal text-zinc-500">
                          {matrix.sizeLengthCm?.[size] ||
                            getDefaultShoeLengthCm(size)}{" "}
                          cm
                        </span>
                      ) : null}
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
