"use client";

import { useMemo, useState, useTransition } from "react";
import { LayoutGrid, List, Palette } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCatalogDesignSettings } from "@/lib/settings/actions";
import {
  getDefaultPrimaryColorForRubro,
  normalizeCatalogPrimaryColor,
} from "@/lib/store-settings/catalog-theme";
import type { CatalogDesignSettings, CatalogLayoutMode } from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface DesignTabProps {
  initialDesign: CatalogDesignSettings;
  storeRubro: string;
}

export function DesignTab({ initialDesign, storeRubro }: DesignTabProps) {
  const rubroDefaultColor = useMemo(
    () => getDefaultPrimaryColorForRubro(storeRubro),
    [storeRubro],
  );
  const [primaryColor, setPrimaryColor] = useState(initialDesign.primaryColor);
  const [layout, setLayout] = useState<CatalogLayoutMode>(initialDesign.layout);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function handleSave() {
    setError(null);
    setSuccessMessage(null);

    startSave(async () => {
      const result = await saveCatalogDesignSettings({
        primaryColor: normalizeCatalogPrimaryColor(primaryColor),
        layout,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccessMessage(
        "Diseño del catálogo guardado. Los cambios ya están visibles en tu vitrina pública.",
      );
    });
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar diseño"
      saving={saving}
      onSave={handleSave}
      saveHint="El color y la vista se aplican de inmediato en tu catálogo público."
    >
      {successMessage ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <SettingsSection
        title="Personalizar diseño"
        description="Ajusta la apariencia de tu catálogo público según tu rubro."
        variant="payments"
      >
        <div className="general-settings-card space-y-4">
          <div>
            <Label htmlFor="catalog-primary-color" className="payment-field-label">
              Color principal
            </Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <input
                id="catalog-primary-color"
                type="color"
                value={primaryColor}
                onChange={(event) => {
                  setPrimaryColor(event.target.value);
                  setSuccessMessage(null);
                }}
                className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                aria-label="Selector de color principal"
              />
              <Input
                value={primaryColor}
                onChange={(event) => {
                  setPrimaryColor(event.target.value);
                  setSuccessMessage(null);
                }}
                placeholder="#0d9488"
                className="payment-field-input max-w-[10rem] font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setPrimaryColor(rubroDefaultColor);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                Color sugerido del rubro
              </button>
            </div>
          </div>

          <div>
            <p className="payment-field-label">Vista de productos</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setLayout("grid");
                  setSuccessMessage(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  layout === "grid"
                    ? "border-emerald-600 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40",
                )}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Cuadrícula
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Ideal para fotos de producto
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayout("list");
                  setSuccessMessage(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  layout === "list"
                    ? "border-emerald-600 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40",
                )}
              >
                <List className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Lista
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Más compacta en móvil
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
