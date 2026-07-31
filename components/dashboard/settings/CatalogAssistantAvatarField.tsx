"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImageIcon, Store, Upload } from "lucide-react";
import { normalizeAssistantAvatarDraft } from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";
import {
  CatalogAssistantAvatarUpload,
  type CatalogAssistantAvatarUploadHandle,
} from "@/components/dashboard/settings/CatalogAssistantAvatarUpload";
import { cn } from "@/lib/cn";

interface CatalogAssistantAvatarFieldProps {
  value: CatalogAssistantAvatarSettings | undefined;
  storeLogoUrl?: string | null;
  onChange: (next: CatalogAssistantAvatarSettings) => void;
  disabled?: boolean;
}

type UiAvatarMode = "store-logo" | "custom";

const MODE_OPTIONS: Array<{
  mode: UiAvatarMode;
  label: string;
  description: string;
}> = [
  {
    mode: "store-logo",
    label: "Logotipo de la tienda",
    description: "Usa el logo que subiste en Identidad.",
  },
  {
    mode: "custom",
    label: "Foto personalizada",
    description: "Sube una imagen desde tu dispositivo.",
  },
];

function resolveUiMode(settings: CatalogAssistantAvatarSettings): UiAvatarMode {
  return settings.mode === "custom" ? "custom" : "store-logo";
}

export function CatalogAssistantAvatarField({
  value,
  storeLogoUrl = null,
  onChange,
  disabled = false,
}: CatalogAssistantAvatarFieldProps) {
  const uploadRef = useRef<CatalogAssistantAvatarUploadHandle>(null);
  const settings = normalizeAssistantAvatarDraft(value);
  const uiMode = resolveUiMode(settings);
  const hasStoreLogo = Boolean(storeLogoUrl?.trim());

  function openCustomUploadPicker() {
    window.requestAnimationFrame(() => {
      uploadRef.current?.openFilePicker();
    });
  }

  function handleModeSelect(mode: UiAvatarMode) {
    if (mode === "store-logo") {
      onChange({ mode: "store-logo" });
      return;
    }

    onChange({
      mode: "custom",
      customImageUrl: settings.customImageUrl,
    });
    openCustomUploadPicker();
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
        Elige cómo se ve el asistente en el chat del catálogo: el logo de tu
        tienda o una foto que subas tú.
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
              {option.mode === "store-logo" ? (
                <Store className="h-4 w-4" />
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

      {uiMode === "store-logo" ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
            {hasStoreLogo ? (
              <Image
                src={storeLogoUrl!}
                alt="Logo de la tienda"
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            ) : (
              <ImageIcon
                className="h-5 w-5 text-zinc-400"
                aria-hidden="true"
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {hasStoreLogo ? "Usando el logo de Identidad" : "Sin logo aún"}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-500">
              {hasStoreLogo
                ? "Si cambias el logo en Identidad, el asistente lo usará automáticamente."
                : "Sube un logo en Identidad para que el asistente lo muestre aquí."}
            </p>
          </div>
        </div>
      ) : (
        <CatalogAssistantAvatarUpload
          ref={uploadRef}
          id="catalog-assistant-avatar-upload"
          value={settings.customImageUrl ?? ""}
          onChange={setCustomImageUrl}
          disabled={disabled}
        />
      )}
    </div>
  );
}
