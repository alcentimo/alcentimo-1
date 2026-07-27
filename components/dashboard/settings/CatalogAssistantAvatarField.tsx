"use client";

import { Store, Sparkles } from "lucide-react";
import {
  getAssistantAvatarGalleryForRubro,
  getAssistantAvatarPreset,
  getDefaultPresetForRubro,
} from "@/lib/store-settings/assistant-avatar-presets";
import { normalizeAssistantAvatarSettings } from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";
import { CatalogAssistantAvatarUpload } from "@/components/dashboard/settings/CatalogAssistantAvatarUpload";
import { AnimatedAssistantAvatar } from "@/components/shared/AnimatedAssistantAvatar";
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
    label: "Personajes de tu rubro",
    description: "Avatares animados pensados para el giro de tu tienda.",
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
  const gallery = getAssistantAvatarGalleryForRubro(storeRubro);
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
        selectedPreset ?? getDefaultPresetForRubro(storeRubro);
      onChange({
        mode: "preset",
        presetId: fallbackPreset.id,
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

  function renderPresetGrid(
    presets: typeof gallery.generalPresets,
    sectionLabel: string,
  ) {
    if (presets.length === 0) return null;

    return (
      <section className="design-assistant-avatar-section">
        <div className="design-assistant-avatar-section-header">
          <Sparkles className="h-3.5 w-3.5 text-teal-500" aria-hidden="true" />
          <h4 className="design-assistant-avatar-section-title">{sectionLabel}</h4>
        </div>
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
                <AnimatedAssistantAvatar
                  imageUrl={preset.imagePath}
                  label={preset.label}
                  size="md"
                  animation={preset.animation}
                  animated
                  className="design-assistant-avatar-option-avatar"
                />
                <span className="design-assistant-avatar-option-label">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="design-assistant-avatar-field space-y-4">
      <p className="text-xs leading-relaxed text-zinc-500">
        Detectamos tu rubro{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {gallery.rubroLabel}
        </span>{" "}
        y mostramos personajes relevantes con micro-animaciones suaves en el
        widget y el chat.
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
              <AnimatedAssistantAvatar
                imageUrl={storeLogoUrl}
                label="Logo"
                size="lg"
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
        <div className="design-assistant-avatar-gallery space-y-5">
          {gallery.rubro !== "general"
            ? renderPresetGrid(
                gallery.rubroPresets,
                `Personajes de ${gallery.rubroLabel}`,
              )
            : null}
          {renderPresetGrid(gallery.generalPresets, "Personajes generales")}
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
