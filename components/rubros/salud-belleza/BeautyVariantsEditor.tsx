"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { VariantFormInput } from "@/lib/products/variants";
import {
  BEAUTY_TONE_PRESETS,
  BEAUTY_VOLUME_PRESETS,
  beautyOptionKey,
  beautyStateToVariants,
  createDefaultBeautyVariants,
  variantsToBeautyState,
  type BeautyVariantMode,
  type BeautyVariantsState,
} from "@/lib/rubros/modules/salud-belleza";
import { cn } from "@/lib/cn";

interface BeautyVariantsEditorProps {
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
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
        active
          ? "border-rose-600 bg-rose-600 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        "disabled:opacity-50",
      )}
    >
      {label}
    </button>
  );
}

function resolveInitial(variants: VariantFormInput[]): BeautyVariantsState {
  if (variants.length > 0) return variantsToBeautyState(variants);
  return createDefaultBeautyVariants("presentacion");
}

export function BeautyVariantsEditor({
  variants,
  onChange,
  disabled = false,
}: BeautyVariantsEditorProps) {
  const [state, setState] = useState<BeautyVariantsState>(() =>
    resolveInitial(variants),
  );
  const [customOption, setCustomOption] = useState("");
  const didSeedRef = useRef(false);

  const presets = useMemo(
    () =>
      state.mode === "presentacion"
        ? [...BEAUTY_VOLUME_PRESETS]
        : [...BEAUTY_TONE_PRESETS],
    [state.mode],
  );

  const optionPresets = useMemo(() => {
    const set = new Set<string>([...presets, ...state.options]);
    return Array.from(set);
  }, [presets, state.options]);

  function commit(next: BeautyVariantsState) {
    const stocks = { ...next.stocks };
    const priceExtras = { ...next.priceExtras };
    const ids = { ...next.ids };
    const activeKeys = new Set<string>();

    for (const option of next.options) {
      const key = beautyOptionKey(option);
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
    onChange(beautyStateToVariants(normalized));
  }

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (variants.length === 0) {
      commit(createDefaultBeautyVariants("presentacion"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once
  }, []);

  function setMode(mode: BeautyVariantMode) {
    if (mode === state.mode) return;
    commit(createDefaultBeautyVariants(mode));
    setCustomOption("");
  }

  function toggleOption(option: string) {
    const key = beautyOptionKey(option);
    const exists = state.options.some((row) => beautyOptionKey(row) === key);
    if (exists) {
      commit({
        ...state,
        options: state.options.filter((row) => beautyOptionKey(row) !== key),
      });
      return;
    }
    commit({
      ...state,
      options: [...state.options, option.trim()],
    });
  }

  function addCustomOption() {
    const value = customOption.trim();
    if (!value) return;
    const key = beautyOptionKey(value);
    if (state.options.some((row) => beautyOptionKey(row) === key)) {
      setCustomOption("");
      return;
    }
    commit({ ...state, options: [...state.options, value] });
    setCustomOption("");
  }

  function updateStock(option: string, stock: string) {
    const key = beautyOptionKey(option);
    commit({
      ...state,
      stocks: { ...state.stocks, [key]: stock },
    });
  }

  function updatePriceExtra(option: string, priceExtraUsd: string) {
    const key = beautyOptionKey(option);
    commit({
      ...state,
      priceExtras: { ...state.priceExtras, [key]: priceExtraUsd },
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Variantes de belleza
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Elige presentación/volumen (ml/g) o tonos de color. Cada opción tiene
          stock y precio extra.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode("presentacion")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
            state.mode === "presentacion"
              ? "border-rose-700 bg-rose-700 text-white"
              : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
          )}
        >
          Presentación / Volumen
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode("tono")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
            state.mode === "tono"
              ? "border-rose-700 bg-rose-700 text-white"
              : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
          )}
        >
          Tonos de color
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {optionPresets.map((option) => (
          <ChipToggle
            key={option}
            label={option}
            active={state.options.some(
              (row) => beautyOptionKey(row) === beautyOptionKey(option),
            )}
            onClick={() => toggleOption(option)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customOption}
          onChange={(e) => setCustomOption(e.target.value)}
          disabled={disabled}
          placeholder={
            state.mode === "presentacion"
              ? "Ej. 75 ml o tubo 40 g"
              : "Ej. Fawn 03"
          }
          className="input-field flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomOption();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustomOption}
          disabled={disabled || !customOption.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>

      {state.options.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-rose-100 bg-white dark:border-rose-900/30 dark:bg-zinc-950">
          <table className="w-full min-w-[280px] text-left text-xs">
            <thead className="border-b border-rose-100 bg-rose-50/80 text-zinc-500 dark:border-rose-900/40 dark:bg-rose-950/40">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {state.mode === "presentacion" ? "Presentación" : "Tono"}
                </th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Extra USD</th>
              </tr>
            </thead>
            <tbody>
              {state.options.map((option) => {
                const key = beautyOptionKey(option);
                return (
                  <tr
                    key={key}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-100">
                      {option}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={state.stocks[key] ?? "0"}
                        onChange={(e) => updateStock(option, e.target.value)}
                        disabled={disabled}
                        className="input-field w-20 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={state.priceExtras[key] ?? "0"}
                        onChange={(e) =>
                          updatePriceExtra(option, e.target.value)
                        }
                        disabled={disabled}
                        className="input-field w-24 py-1 text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Selecciona al menos una opción de{" "}
          {state.mode === "presentacion" ? "volumen" : "tono"}.
        </p>
      )}
    </div>
  );
}
