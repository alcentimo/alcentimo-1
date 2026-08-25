"use client";

import { Plus } from "lucide-react";
import {
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_SIZE_PRESETS,
} from "@/lib/rubros/modules/ropa-moda";
import {
  MAX_SUPPLIER_VARIANT_SKUS,
  applyUniformPriceToSupplierSkus,
  emptySupplierFashionVariants,
  rebuildSupplierSkus,
  supplierAxisLabel,
  type SupplierProductVariants,
  type SupplierVariantAttribute,
  type SupplierVariantAxis,
} from "@/lib/supplier/variants";

interface SupplierFashionVariantsEditorProps {
  idPrefix: string;
  value: SupplierProductVariants;
  disabled?: boolean;
  /** Costo (USD) del producto; se copia a todas las filas si no hay precios diferenciados. */
  basePriceUsd?: string;
  /** Stock general; se usa como valor inicial de combinaciones nuevas. */
  generalStock?: string;
  onChange: (next: SupplierProductVariants) => void;
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
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function ensureFashionAxes(
  value: SupplierProductVariants,
): SupplierProductVariants {
  if (value.axes && value.axes.length >= 1) {
    const axes = [...value.axes];
    if (!axes.some((axis) => axis.attribute === "talla")) {
      axes.unshift({ id: "axis-talla", attribute: "talla", values: [] });
    }
    if (!axes.some((axis) => axis.attribute === "color")) {
      axes.push({ id: "axis-color", attribute: "color", values: [] });
    }
    return { ...value, axes, attribute: "talla" };
  }

  if (value.options.length > 0) {
    const attr = value.attribute;
    const axis: SupplierVariantAxis = {
      id: "axis-legacy",
      attribute: attr,
      attributeLabel: value.attributeLabel,
      values: value.options.map((option) => option.label),
    };
    const extra: SupplierVariantAxis =
      attr === "color"
        ? { id: "axis-talla", attribute: "talla", values: [] }
        : { id: "axis-color", attribute: "color", values: [] };
    const axes = attr === "color" ? [extra, axis] : [axis, extra];
    return {
      ...emptySupplierFashionVariants(),
      axes,
      skus: rebuildSupplierSkus(axes, value.skus),
    };
  }

  return emptySupplierFashionVariants();
}

function parseGeneralStock(raw: string | undefined): number {
  const parsed = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function commit(
  next: SupplierProductVariants,
  onChange: (value: SupplierProductVariants) => void,
  uniformPrice = 0,
  generalStock = 0,
) {
  const axes = next.axes ?? [];
  let rebuilt: SupplierProductVariants = {
    ...next,
    attribute: (axes[0]?.attribute ?? "talla") as SupplierVariantAttribute,
    skus: rebuildSupplierSkus(axes, next.skus, generalStock),
  };
  if (!rebuilt.differentiatedPrices) {
    rebuilt = applyUniformPriceToSupplierSkus(rebuilt, uniformPrice);
  }
  onChange(rebuilt);
}

export function SupplierFashionVariantsEditor({
  idPrefix,
  value,
  disabled = false,
  basePriceUsd = "",
  generalStock = "",
  onChange,
}: SupplierFashionVariantsEditorProps) {
  const variants = ensureFashionAxes(value);
  const axes = variants.axes ?? [];
  const fallbackStock = parseGeneralStock(generalStock);
  const skus = variants.skus ?? rebuildSupplierSkus(axes, undefined, fallbackStock);
  const differentiated = Boolean(variants.differentiatedPrices);
  const parsedBase = Number(String(basePriceUsd).replace(",", "."));
  const uniformPrice =
    Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : 0;

  function toggleValue(axisId: string, item: string) {
    const nextAxes = axes.map((axis) => {
      if (axis.id !== axisId) return axis;
      const exists = axis.values.some(
        (valueItem) => valueItem.toLowerCase() === item.toLowerCase(),
      );
      return {
        ...axis,
        values: exists
          ? axis.values.filter(
              (valueItem) => valueItem.toLowerCase() !== item.toLowerCase(),
            )
          : [...axis.values, item],
      };
    });
    commit({ ...variants, axes: nextAxes }, onChange, uniformPrice, fallbackStock);
  }

  function addCustomValue(axisId: string, raw: string) {
    const item = raw.trim();
    if (!item) return;
    const axis = axes.find((entry) => entry.id === axisId);
    if (
      !axis ||
      axis.values.some((valueItem) => valueItem.toLowerCase() === item.toLowerCase())
    ) {
      return;
    }
    commit(
      {
        ...variants,
        axes: axes.map((entry) =>
          entry.id === axisId
            ? { ...entry, values: [...entry.values, item] }
            : entry,
        ),
      },
      onChange,
      uniformPrice,
      fallbackStock,
    );
  }

  function updateSku(
    skuId: string,
    patch: { stock?: string; priceUsd?: string },
  ) {
    onChange({
      ...variants,
      skus: skus.map((sku) => {
        if (sku.id !== skuId) return sku;
        const next = { ...sku };
        if (patch.stock != null) {
          const parsed = Number.parseInt(patch.stock, 10);
          next.stock = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
        if (patch.priceUsd != null) {
          const parsed = Number(patch.priceUsd.replace(",", "."));
          next.priceUsd = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
        return next;
      }),
    });
  }

  return (
    <div className="supplier-hub-soft-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="supplier-hub-section-label">Talla y color</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Elige talla, color o ambos.             Cada combinación generada (ej. M, o M /
            Negro) toma el stock general si no indicas uno propio. Los campos
            “Otra talla” u “Otro color” son opcionales. El costo (USD) del
            producto se aplica a todas salvo que actives precios diferenciados
            {skus.length > 0
              ? ` · ${skus.length} variante${skus.length === 1 ? "" : "s"}`
              : ""}
            .
          </p>
        </div>
        {axes.some((axis) => axis.values.length > 0) ? (
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 hover:text-red-600"
            onClick={() => onChange(emptySupplierFashionVariants())}
            disabled={disabled}
          >
            Quitar variantes
          </button>
        ) : null}
      </div>

      {axes.map((axis) => {
        const presets =
          axis.attribute === "talla"
            ? ROPA_MODA_SIZE_PRESETS
            : axis.attribute === "color"
              ? ROPA_MODA_COLOR_PRESETS
              : [];
        const extras = axis.values.filter(
          (item) =>
            !(presets as readonly string[]).some(
              (preset) => preset.toLowerCase() === item.toLowerCase(),
            ),
        );
        const inputId = `${idPrefix}-${axis.id}-custom`;

        return (
          <div key={axis.id} className="space-y-2">
            <p className="label-field mb-0 text-xs">{supplierAxisLabel(axis)}</p>
            <div className="flex flex-wrap gap-1.5">
              {[...presets, ...extras].map((item) => (
                <ChipToggle
                  key={item}
                  label={item}
                  active={axis.values.some(
                    (valueItem) =>
                      valueItem.toLowerCase() === item.toLowerCase(),
                  )}
                  onClick={() => toggleValue(axis.id, item)}
                  disabled={disabled}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={inputId}
                type="text"
                maxLength={30}
                disabled={disabled}
                placeholder={
                  axis.attribute === "talla"
                    ? "Otra talla (ej. XXL)"
                    : "Otro color"
                }
                className="input-field mt-0 min-h-10 flex-1 py-2 text-sm sm:min-h-0"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addCustomValue(axis.id, event.currentTarget.value);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="btn-brand-outline !min-h-10 !px-3 !text-xs sm:min-h-0"
                disabled={disabled}
                onClick={() => {
                  const input = document.getElementById(
                    inputId,
                  ) as HTMLInputElement | null;
                  if (!input) return;
                  addCustomValue(axis.id, input.value);
                  input.value = "";
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Añadir
              </button>
            </div>
          </div>
        );
      })}

      {skus.length > MAX_SUPPLIER_VARIANT_SKUS ? (
        <p className="text-xs text-amber-700">
          Máximo {MAX_SUPPLIER_VARIANT_SKUS} combinaciones.
        </p>
      ) : null}

      {skus.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white dark:border-emerald-900/40 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-50 px-3 py-2 dark:border-emerald-950/60">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              {differentiated
                ? "Cada combinación usa su propio precio."
                : uniformPrice > 0
                  ? `Precio mayorista / costo base aplicado a todas: $${uniformPrice.toFixed(2)}`
                  : "Indica el precio mayorista / costo base (USD) arriba; se copiará a todas las combinaciones."}
            </p>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                differentiated
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              }`}
              disabled={disabled}
              onClick={() => {
                if (differentiated) {
                  onChange(
                    applyUniformPriceToSupplierSkus(variants, uniformPrice),
                  );
                  return;
                }
                onChange({
                  ...variants,
                  differentiatedPrices: true,
                  skus: skus.map((sku) => ({
                    ...sku,
                    priceUsd:
                      sku.priceUsd > 0 ? sku.priceUsd : uniformPrice,
                  })),
                });
              }}
            >
              Precios diferenciados por variante
            </button>
          </div>
          <ul className="divide-y divide-emerald-50 dark:divide-emerald-950/60">
            {skus.map((sku) => (
              <li
                key={sku.id}
                className={`flex flex-wrap items-end gap-2 p-3 sm:items-center ${
                  differentiated
                    ? "sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem]"
                    : "sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem]"
                }`}
              >
                <p className="w-full text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {sku.label}
                </p>
                <div className="w-24 sm:w-auto">
                  <label
                    htmlFor={`${idPrefix}-stock-${sku.id}`}
                    className="label-field"
                  >
                    Stock *
                  </label>
                  <input
                    id={`${idPrefix}-stock-${sku.id}`}
                    type="number"
                    min={0}
                    step={1}
                    required
                    disabled={disabled}
                    value={String(sku.stock)}
                    onChange={(event) =>
                      updateSku(sku.id, { stock: event.target.value })
                    }
                    className="input-field"
                    aria-label={`Stock ${sku.label}`}
                  />
                </div>
                {differentiated ? (
                  <div className="w-28 sm:w-auto">
                    <label
                      htmlFor={`${idPrefix}-price-${sku.id}`}
                      className="label-field"
                    >
                      Precio mayorista / costo base USD *
                    </label>
                    <input
                      id={`${idPrefix}-price-${sku.id}`}
                      type="number"
                      min={0.01}
                      step="0.01"
                      required
                      disabled={disabled}
                      value={sku.priceUsd ? String(sku.priceUsd) : ""}
                      placeholder="0.00"
                      onChange={(event) =>
                        updateSku(sku.id, { priceUsd: event.target.value })
                      }
                      className="input-field"
                      aria-label={`Precio ${sku.label}`}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="border-t border-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500 dark:border-emerald-950/60">
            El stock general se aplica a combinaciones nuevas o sin stock
            propio. Un stock 0 en una fila la oculta en el catálogo del
            dropshipper; el producto no se puede guardar si el total queda en 0.
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Elige al menos un valor en Talla y en Color para generar las
          combinaciones.
        </p>
      )}
    </div>
  );
}
