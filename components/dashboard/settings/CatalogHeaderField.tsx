"use client";

import { useEffect, useState } from "react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import {
  catalogHeaderSummary,
  normalizeCatalogHeaderDraft,
} from "@/lib/store-settings/catalog-header";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";
import type {
  CatalogHeaderAlignment,
  CatalogHeaderBgMode,
  CatalogHeaderSettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface CatalogHeaderFieldProps {
  value?: CatalogHeaderSettings | null;
  brandColor: string;
  disabled?: boolean;
  onChange: (next: CatalogHeaderSettings, shouldSave?: boolean) => void;
}

const BG_MODE_OPTIONS: {
  value: CatalogHeaderBgMode;
  label: string;
  description: string;
}[] = [
  {
    value: "theme",
    label: "Tema",
    description: "Usa el fondo del tema visual seleccionado.",
  },
  {
    value: "brand",
    label: "Color de marca",
    description: "Aplica automáticamente el color principal de la tienda.",
  },
  {
    value: "solid",
    label: "Color sólido",
    description: "Elige un color fijo para la cabecera.",
  },
];

const ALIGNMENT_OPTIONS: {
  value: CatalogHeaderAlignment;
  label: string;
  description: string;
}[] = [
  {
    value: "split",
    label: "Clásica",
    description: "Logo a la izquierda y botones a la derecha.",
  },
  {
    value: "stacked",
    label: "Centrada",
    description: "Logo, nombre y acciones apilados al centro.",
  },
];

export function CatalogHeaderField({
  value,
  brandColor,
  disabled = false,
  onChange,
}: CatalogHeaderFieldProps) {
  const header = normalizeCatalogHeaderDraft(value);
  const effectiveSolid =
    normalizeHex6(header.bgColor ?? "") ?? normalizeHex6(brandColor) ?? "#0d9488";
  const [hexInput, setHexInput] = useState(effectiveSolid);

  useEffect(() => {
    setHexInput(effectiveSolid);
  }, [effectiveSolid]);

  function patch(partial: Partial<CatalogHeaderSettings>, shouldSave = true) {
    onChange(
      normalizeCatalogHeaderDraft({
        ...header,
        ...partial,
      }),
      shouldSave,
    );
  }

  function commitHexInput() {
    const normalized = normalizeHex6(hexInput);
    if (!normalized) {
      setHexInput(effectiveSolid);
      return;
    }
    setHexInput(normalized);
    patch({ bgMode: "solid", bgColor: normalized });
  }

  return (
    <div className="design-header-field space-y-4">
      <p className="text-xs leading-relaxed text-zinc-500">
        Personaliza el bloque superior del catálogo (logo, nombre y botones).
        Resumen: {catalogHeaderSummary(header)}.
      </p>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Color de fondo
        </p>
        <div className="design-option-list">
          {BG_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={header.bgMode === option.value}
              onClick={() =>
                patch({
                  bgMode: option.value,
                  ...(option.value === "solid" && !header.bgColor
                    ? { bgColor: effectiveSolid }
                    : {}),
                })
              }
              className={cn(
                "design-option",
                header.bgMode === option.value && "design-option-selected",
              )}
            >
              <span
                className={cn(
                  "design-option-radio",
                  header.bgMode === option.value && "design-option-radio-selected",
                )}
                aria-hidden="true"
              >
                {header.bgMode === option.value ? (
                  <span className="design-option-radio-dot" />
                ) : null}
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>

        {header.bgMode === "solid" ? (
          <div className="design-brand-color-controls mt-3">
            <label
              className={cn(
                "design-brand-color-swatch-btn",
                disabled && "pointer-events-none opacity-60",
              )}
              title="Elegir color de cabecera"
            >
              <span
                className="block h-full w-full"
                style={{ backgroundColor: effectiveSolid }}
                aria-hidden="true"
              />
              <input
                type="color"
                value={effectiveSolid}
                disabled={disabled}
                onChange={(event) =>
                  patch({
                    bgMode: "solid",
                    bgColor: event.target.value.toLowerCase(),
                  })
                }
                className="design-brand-color-native"
                aria-label="Color sólido de la cabecera"
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
                  event.currentTarget.blur();
                }
              }}
              className="design-brand-color-hex"
              spellCheck={false}
              aria-label="Código hex del color de cabecera"
            />
          </div>
        ) : null}

        {header.bgMode === "brand" ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: brandColor }}
              aria-hidden="true"
            />
            Se usará {brandColor.toUpperCase()}
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Imagen de portada
        </p>
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          Opcional. Imagen horizontal detrás del logo y el nombre.
        </p>
        <CatalogBannerImageUpload
          id="catalog-header-cover"
          label="Portada de cabecera"
          hint="Recomendado 1600×600 o similar (horizontal)."
          value={header.coverImageUrl ?? ""}
          variant="desktop"
          layout="compact"
          disabled={disabled}
          onChange={(url) => patch({ coverImageUrl: url || undefined })}
          onRemoveSlide={
            header.coverImageUrl
              ? () => patch({ coverImageUrl: undefined })
              : undefined
          }
          removeSlideLabel="Quitar portada"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Estilo de cabecera
        </p>
        <div className="design-option-list">
          {ALIGNMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={header.alignment === option.value}
              onClick={() => patch({ alignment: option.value })}
              className={cn(
                "design-option",
                header.alignment === option.value && "design-option-selected",
              )}
            >
              <span
                className={cn(
                  "design-option-radio",
                  header.alignment === option.value &&
                    "design-option-radio-selected",
                )}
                aria-hidden="true"
              >
                {header.alignment === option.value ? (
                  <span className="design-option-radio-dot" />
                ) : null}
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
