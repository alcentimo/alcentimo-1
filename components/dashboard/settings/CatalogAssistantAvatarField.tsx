"use client";

import Image from "next/image";
import { Store } from "lucide-react";
import {
  getAssistantAvatarCategoriesForRubro,
  getAssistantAvatarPreset,
  getAssistantAvatarPresetsByCategory,
} from "@/lib/store-settings/assistant-avatar-presets";
import { normalizeAssistantAvatarSettings } from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";
import { CatalogAssistantAvatarUpload } from "@/components/dashboard/settings/CatalogAssistantAvatarUpload";
import { cn } from "@/lib/cn";

interface CatalogAssistantAvatarFieldProps {
  value: CatalogAssistantAvatarSettings | undefined;
  storeRubro?: string | null;
  storeLogoUrl?: string | null;
  onChange: (next: CatalogAssistantAvatarSettings) => void;
  disabled?: boolean;
}

type AvatarMode = CatalogAssistantAvatarSettings["mode"];

const MODE_OPTIONS: Array<{
  mode: AvatarMode;
  label: string;
  description: string;
}> = [
  {
    mode: "store-logo",
    label: "Logo clásico",
    description: "Usa el logo de tu tienda o la foto del comerciante.",
  },
  {
    mode: "preset",
    label: "Galería de personajes",
    description: "Elige un avatar predefinido según el estilo de tu rubro.",
  },
  {
    mode: "custom",
    label: "Avatar personalizado",
    description: "Sube tu propia imagen cuadrada para el asistente.",
  },
];

export function CatalogAssistantAvatarField({
  value,
  storeRubro = null,
  storeLogoUrl = null,
  onChange,
  disabled = false,
}: CatalogAssistantAvatarFieldProps) {
  const settings = normalizeAssistantAvatarSettings(value);
  const categories = getAssistantAvatarCategoriesForRubro(storeRubro);
  const selectedPreset = settings.presetId
    ? getAssistantAvatarPreset(settings.presetId)
    : undefined;

  function setMode(mode: AvatarMode) {
    if (mode === settings.mode) return;

    if (mode === "store-logo") {
      onChange({ mode: "store-logo" });
      return;
    }

    if (mode === "preset") {
      const fallbackPreset =
        selectedPreset ??
        getAssistantAvatarPresetsByCategory(
          categories.find((category) => category.id !== "general")?.id ??
            "general",
        )[0];
      onChange({
        mode: "preset",
        presetId: fallbackPreset?.id,
      });
      return;
    }

    onChange({
      mode: "custom",
      customImageUrl: settings.customImageUrl,
    });
  }

  function setPreset(presetId: string) {
    onChange({ mode: "preset", presetId });
  }

  function setCustomImageUrl(customImageUrl: string) {
    if (!customImageUrl.trim()) {
      onChange({ mode: "store-logo" });
      return;
    }

    onChange({ mode: "custom", customImageUrl });
  }

  return (
    <div className="design-assistant-avatar-field space-y-4">
      <p className="text-xs leading-relaxed text-zinc-500">
        Personaliza el avatar del widget flotante de IA y del chat público de tu
        catálogo.
      </p>

      <div className="space-y-1">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={disabled}
            onClick={() => setMode(option.mode)}
            className={cn(
              "design-option w-full",
              settings.mode === option.mode && "design-option-selected",
            )}
          >
            <span className="min-w-0 text-left">
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
                {option.description}
              </span>
            </span>
          </button>
        ))}
      </div>

      {settings.mode === "store-logo" ? (
        <div className="design-assistant-avatar-preview-card">
          <div
            className={cn(
              "design-assistant-avatar-preview-circle",
              !storeLogoUrl && "design-assistant-avatar-preview-circle-empty",
            )}
          >
            {storeLogoUrl ? (
              <Image
                src={storeLogoUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <Store className="h-6 w-6 text-zinc-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Vista previa del logo clásico
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {storeLogoUrl
                ? "Se mostrará tu logo o icono de tienda en el asistente."
                : "Configura el logo de tu tienda en Identidad para verlo aquí."}
            </p>
          </div>
        </div>
      ) : null}

      {settings.mode === "preset" ? (
        <div className="space-y-4">
          {categories.map((category) => {
            const presets = getAssistantAvatarPresetsByCategory(category.id);
            if (presets.length === 0) return null;

            return (
              <section key={category.id} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {category.label}
                </h4>
                <div className="design-assistant-avatar-grid">
                  {presets.map((preset) => {
                    const selected = settings.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPreset(preset.id)}
                        className={cn(
                          "design-assistant-avatar-option",
                          selected && "design-assistant-avatar-option-selected",
                        )}
                        aria-pressed={selected}
                        title={preset.label}
                      >
                        <span className="design-assistant-avatar-option-image">
                          <Image
                            src={preset.imagePath}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </span>
                        <span className="design-assistant-avatar-option-label">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {settings.mode === "custom" ? (
        <CatalogAssistantAvatarUpload
          id="catalog-assistant-avatar-upload"
          value={settings.customImageUrl ?? ""}
          onChange={setCustomImageUrl}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
