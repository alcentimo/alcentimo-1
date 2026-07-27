"use client";

import { useEffect, useState } from "react";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";
import { cn } from "@/lib/cn";

interface CatalogPrimaryColorFieldProps {
  /** Color personalizado guardado (undefined = predeterminado del rubro/tema). */
  color?: string;
  /** Color efectivo mostrado en el selector. */
  effectiveColor: string;
  rubroLabel: string;
  disabled?: boolean;
  onPick: (hex: string) => void;
  onReset: () => void;
}

export function CatalogPrimaryColorField({
  color,
  effectiveColor,
  rubroLabel,
  disabled = false,
  onPick,
  onReset,
}: CatalogPrimaryColorFieldProps) {
  const [hexInput, setHexInput] = useState(effectiveColor);
  const hasCustomColor = Boolean(color?.trim());

  useEffect(() => {
    setHexInput(effectiveColor);
  }, [effectiveColor]);

  function commitHexInput() {
    const normalized = normalizeHex6(hexInput);
    if (normalized) {
      setHexInput(normalized);
      if (normalized !== color) {
        onPick(normalized);
      }
      return;
    }

    setHexInput(effectiveColor);
  }

  return (
    <div className="design-brand-color-panel">
      <div className="design-brand-color-row">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Color principal
          </p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-500">
            Botones, enlaces y acentos del catálogo público.
          </p>
        </div>

        <div className="design-brand-color-controls">
          <label
            className={cn(
              "design-brand-color-swatch-btn",
              disabled && "pointer-events-none opacity-60",
            )}
            title="Elegir color"
          >
            <span
              className="block h-full w-full"
              style={{ backgroundColor: effectiveColor }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={effectiveColor}
              disabled={disabled}
              onChange={(event) => onPick(event.target.value.toLowerCase())}
              className="design-brand-color-native"
              aria-label="Elegir color principal"
            />
          </label>

          <input
            type="text"
            value={hexInput}
            disabled={disabled}
            onChange={(event) => setHexInput(event.target.value)}
            onBlur={commitHexInput}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitHexInput();
              }
            }}
            className="input-field design-brand-color-hex"
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            aria-label="Código hexadecimal del color"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-2">
        <p className="text-xs text-zinc-500">
          {hasCustomColor
            ? "Color personalizado activo."
            : `Predeterminado del rubro ${rubroLabel}.`}
        </p>
        {hasCustomColor ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onReset}
            className="design-brand-color-reset shrink-0 disabled:opacity-60"
          >
            Restaurar predeterminado
          </button>
        ) : null}
      </div>
    </div>
  );
}
