"use client";

import { useRef } from "react";
import { Upload, Sparkles } from "lucide-react";
import {
  getAssistantAvatarGalleryForRubro,
  getAssistantAvatarPreset,
  getDefaultPresetForRubro,
} from "@/lib/store-settings/assistant-avatar-presets";
import { normalizeAssistantAvatarDraft } from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";
import {
  CatalogAssistantAvatarUpload,
  type CatalogAssistantAvatarUploadHandle,
} from "@/components/dashboard/settings/CatalogAssistantAvatarUpload";
import { AnimatedAssistantAvatar } from "@/components/shared/AnimatedAssistantAvatar";
import { cn } from "@/lib/cn";

interface CatalogAssistantAvatarFieldProps {
  value: CatalogAssistantAvatarSettings | undefined;
  storeRubro?: string | null;
  onChange: (next: CatalogAssistantAvatarSettings) => void;
  disabled?: boolean;
}

type UiAvatarMode = "preset" | "custom";

const MODE_OPTIONS: Array<{
  mode: UiAvatarMode;
  label: string;
  description: string;
}> = [
  {
    mode: "preset",
    label: "Personajes de tu rubro",
    description: "Elige un asistente con personalidad acorde a tu tienda.",
  },
  {
    mode: "custom",
    label: "Tu foto personalizada",
    description: "Toca para elegir una imagen desde tu dispositivo.",
  },
];

function resolveUiMode(settings: CatalogAssistantAvatarSettings): UiAvatarMode {
  if (settings.mode === "custom") return "custom";
  return "preset";
}

export function CatalogAssistantAvatarField({
  value,
  storeRubro = null,
  onChange,
  disabled = false,
}: CatalogAssistantAvatarFieldProps) {
  const uploadRef = useRef<CatalogAssistantAvatarUploadHandle>(null);
  const settings = normalizeAssistantAvatarDraft(value);
  const uiMode = resolveUiMode(settings);
  const gallery = getAssistantAvatarGalleryForRubro(storeRubro);
  const selectedPreset = settings.presetId
    ? getAssistantAvatarPreset(settings.presetId)
    : undefined;

  function openCustomUploadPicker() {
    window.requestAnimationFrame(() => {
      uploadRef.current?.openFilePicker();
    });
  }

  function selectPresetMode() {
    if (uiMode === "preset") return;

    const fallbackPreset =
      selectedPreset ?? getDefaultPresetForRubro(storeRubro);
    if (!fallbackPreset) return;

    onChange({
      mode: "preset",
      presetId: fallbackPreset.id,
    });
  }

  function selectCustomMode() {
    onChange({
      mode: "custom",
      customImageUrl: settings.customImageUrl,
    });
    openCustomUploadPicker();
  }

  function handleModeSelect(mode: UiAvatarMode) {
    if (mode === "custom") {
      selectCustomMode();
      return;
    }
    selectPresetMode();
  }

  function setPreset(presetId: string) {
    onChange({ mode: "preset", presetId });
  }

  function setCustomImageUrl(customImageUrl: string) {
    if (!customImageUrl.trim()) {
      onChange({ mode: "custom" });
      return;
    }

    onChange({ mode: "custom", customImageUrl });
  }

  return (
    <div className="design-assistant-avatar-field space-y-3">
      <p className="text-xs leading-relaxed text-zinc-500">
        Rubro detectado:{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-200">
          {gallery.rubroLabel}
        </span>
        . Solo verás personajes de este rubro o tu foto personalizada.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={disabled}
            onClick={() => handleModeSelect(option.mode)}
            className={cn(
              "design-assistant-mode-card",
              uiMode === option.mode && "design-assistant-mode-card-selected",
            )}
          >
            <span className="design-assistant-mode-icon" aria-hidden="true">
              {option.mode === "preset" ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </span>
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

      {uiMode === "preset" ? (
        <section className="design-assistant-avatar-gallery">
          <div className="design-assistant-avatar-section-header">
            <Sparkles className="h-3.5 w-3.5 text-teal-500" aria-hidden="true" />
            <h4 className="design-assistant-avatar-section-title">
              Personajes de {gallery.rubroLabel}
            </h4>
          </div>
          <div className="design-assistant-avatar-scroll">
            <div className="design-assistant-avatar-grid">
              {gallery.rubroPresets.map((preset) => {
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
                    <span className="design-assistant-avatar-option-stage">
                      <AnimatedAssistantAvatar
                        imageUrl={preset.imagePath}
                        label={preset.label}
                        variant="character"
                        animation={preset.animation}
                        animated
                        className="design-assistant-avatar-option-avatar"
                      />
                    </span>
                    <span className="design-assistant-avatar-option-label">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(uiMode !== "custom" && "hidden")} aria-hidden={uiMode !== "custom"}>
        <CatalogAssistantAvatarUpload
          ref={uploadRef}
          id="catalog-assistant-avatar-upload"
          value={settings.customImageUrl ?? ""}
          onChange={setCustomImageUrl}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
