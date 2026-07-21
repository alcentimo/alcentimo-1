"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  ALIMENTOS_PORTION_PRESETS,
  createDefaultFoodPortions,
  foodPortionsToVariants,
  portionKey,
  variantsToFoodPortions,
  type FoodPortionsState,
} from "@/lib/rubros/modules/alimentos";

interface FoodPortionsEditorProps {
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
          ? "border-amber-700 bg-amber-700 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function resolveInitial(variants: VariantFormInput[]): FoodPortionsState {
  if (variants.length > 0) return variantsToFoodPortions(variants);
  return createDefaultFoodPortions();
}

export function FoodPortionsEditor({
  variants,
  onChange,
  disabled = false,
}: FoodPortionsEditorProps) {
  const [state, setState] = useState<FoodPortionsState>(() =>
    resolveInitial(variants),
  );
  const [customPortion, setCustomPortion] = useState("");
  const didSeedRef = useRef(false);

  const portionPresets = useMemo(() => {
    const set = new Set<string>([
      ...ALIMENTOS_PORTION_PRESETS,
      ...state.portions,
    ]);
    return Array.from(set);
  }, [state.portions]);

  function commit(next: FoodPortionsState) {
    const stocks = { ...next.stocks };
    const priceExtras = { ...next.priceExtras };
    const ids = { ...next.ids };
    const activeKeys = new Set<string>();

    for (const portion of next.portions) {
      const key = portionKey(portion);
      activeKeys.add(key);
      if (stocks[key] == null) stocks[key] = "0";
      if (priceExtras[key] == null) priceExtras[key] = "0";
    }

    for (const key of Object.keys(stocks)) {
      if (!activeKeys.has(key)) {
        delete stocks[key];
        delete priceExtras[key];
        delete ids[key];
      }
    }

    const normalized = { ...next, stocks, priceExtras, ids };
    setState(normalized);
    onChange(foodPortionsToVariants(normalized));
  }

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (variants.length === 0) {
      commit(createDefaultFoodPortions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
  }, []);

  function togglePortion(portion: string) {
    const key = portionKey(portion);
    const exists = state.portions.some((row) => portionKey(row) === key);
    if (exists) {
      commit({
        ...state,
        portions: state.portions.filter((row) => portionKey(row) !== key),
      });
      return;
    }
    commit({
      ...state,
      portions: [...state.portions, portion.trim()],
    });
  }

  function addCustomPortion() {
    const value = customPortion.trim();
    if (!value) return;
    if (state.portions.some((row) => portionKey(row) === portionKey(value))) {
      setCustomPortion("");
      return;
    }
    commit({
      ...state,
      portions: [...state.portions, value],
    });
    setCustomPortion("");
  }

  function setStock(portion: string, stock: string) {
    const key = portionKey(portion);
    commit({
      ...state,
      stocks: { ...state.stocks, [key]: stock },
    });
  }

  function setPriceExtra(portion: string, price: string) {
    const key = portionKey(portion);
    commit({
      ...state,
      priceExtras: { ...state.priceExtras, [key]: price },
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Porciones / tamaños
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Define presentaciones (Personal, Mediana, Grande…) con stock y precio
          extra por tamaño.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {portionPresets.map((portion) => (
          <ChipToggle
            key={portion}
            label={portion}
            active={state.portions.some(
              (row) => portionKey(row) === portionKey(portion),
            )}
            onClick={() => togglePortion(portion)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customPortion}
          onChange={(e) => setCustomPortion(e.target.value)}
          placeholder="Otra (ej. 500 ml, 1 L)"
          maxLength={40}
          disabled={disabled}
          className="input-field mt-0 flex-1 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustomPortion}
          disabled={disabled || !customPortion.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir
        </button>
      </div>

      {state.portions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-100/80 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium text-zinc-600">Porción</th>
                <th className="px-3 py-2 font-medium text-zinc-600">Stock</th>
                <th className="px-3 py-2 font-medium text-zinc-600">
                  Extra USD
                </th>
              </tr>
            </thead>
            <tbody>
              {state.portions.map((portion) => {
                const key = portionKey(portion);
                return (
                  <tr
                    key={key}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-100">
                      {portion}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={state.stocks[key] ?? "0"}
                        onChange={(e) => setStock(portion, e.target.value)}
                        disabled={disabled}
                        aria-label={`Stock ${portion}`}
                        className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={state.priceExtras[key] ?? "0"}
                        onChange={(e) => setPriceExtra(portion, e.target.value)}
                        disabled={disabled}
                        aria-label={`Precio extra ${portion}`}
                        className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700/20 dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            El precio base del producto aplica a todas; el extra suma por porción.
            Deja porciones vacías si el plato no tiene tamaños.
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Sin porciones: el producto usará un solo stock general.
        </p>
      )}
    </div>
  );
}
