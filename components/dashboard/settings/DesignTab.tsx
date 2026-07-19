"use client";

import { useCallback, useState, useTransition } from "react";
import { Check, Eye, EyeOff, Sparkles, Zap } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DesignCatalogInlinePreview } from "@/components/dashboard/settings/DesignCatalogInlinePreview";
import { DesignThemePreviewCard } from "@/components/dashboard/settings/DesignThemePreviewCard";
import { saveCatalogDesignSettings } from "@/lib/settings/actions";
import {
  CATALOG_SALE_MODE_IDS,
  CATALOG_SALE_MODE_PRESETS,
  CATALOG_THEME_IDS,
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type {
  CatalogDesignSettings,
  CatalogSaleMode,
  CatalogThemeId,
  CatalogVisibilitySettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface DesignTabPreviewContext {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
}

interface DesignTabProps {
  initialDesign: CatalogDesignSettings;
  preview?: DesignTabPreviewContext | null;
}

type SavingField =
  | CatalogThemeId
  | CatalogSaleMode
  | keyof CatalogVisibilitySettings
  | null;

function SaleModePreview({ mode, primaryColor }: { mode: CatalogSaleMode; primaryColor: string }) {
  const isQuick = mode === "quick";

  return (
    <div
      className="mt-3 overflow-hidden rounded-lg border border-zinc-200/80 dark:border-zinc-700"
      aria-hidden="true"
    >
      <div className="flex gap-2 bg-zinc-50 p-2 dark:bg-zinc-900/50">
        <div className="aspect-square w-10 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />
          {isQuick ? (
            <>
              <div
                className="h-2.5 w-2/5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <div
                className="mt-0.5 h-3 w-full rounded-md"
                style={{ backgroundColor: primaryColor }}
              />
            </>
          ) : (
            <>
              <div className="h-1.5 w-2/5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <div className="mt-1 h-2 w-3/5 rounded-md border border-zinc-300 dark:border-zinc-600" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DesignTab({ initialDesign, preview = null }: DesignTabProps) {
  const [design, setDesign] = useState(initialDesign);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [isSaving, startSave] = useTransition();

  const persist = useCallback(
    (nextDesign: CatalogDesignSettings, field: SavingField) => {
      setError(null);
      setSavingField(field);

      startSave(async () => {
        const result = await saveCatalogDesignSettings(nextDesign);
        setSavingField(null);

        if (result.error) {
          setError(result.error);
          setDesign(initialDesign);
        }
      });
    },
    [initialDesign],
  );

  function updateDesign(
    patch: Partial<CatalogDesignSettings>,
    field: SavingField,
  ) {
    const nextDesign: CatalogDesignSettings = {
      ...design,
      ...patch,
      visibility: patch.visibility
        ? { ...design.visibility, ...patch.visibility }
        : design.visibility,
    };
    setDesign(nextDesign);
    persist(nextDesign, field);
  }

  function setTheme(theme: CatalogThemeId) {
    if (theme === design.theme) return;
    updateDesign({ theme }, theme);
  }

  function setSaleMode(saleMode: CatalogSaleMode) {
    if (saleMode === design.saleMode) return;
    updateDesign({ saleMode }, saleMode);
  }

  function setVisibility(
    key: keyof CatalogVisibilitySettings,
    value: boolean,
  ) {
    if (design.visibility[key] === value) return;
    updateDesign(
      { visibility: { ...design.visibility, [key]: value } },
      key,
    );
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Los cambios se guardan automáticamente en tu catálogo público.
        </p>
        <SavingHint visible={isSaving} />
      </div>

      <SettingsSection
        title="Temas de diseño"
        description="Elige un estilo completo. Tipografía, espaciado y botones se aplican solos."
        variant="payments"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
            {CATALOG_THEME_IDS.map((themeId) => {
              const preset = CATALOG_THEME_PRESETS[themeId];
              const selected = design.theme === themeId;
              const isFieldSaving = savingField === themeId;
              const accent = preset.primaryColor;

              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => setTheme(themeId)}
                  disabled={isSaving && isFieldSaving}
                  className="text-left"
                >
                  <Card
                    className={cn(
                      "h-full overflow-hidden transition",
                      selected
                        ? "ring-1"
                        : "hover:border-zinc-300 dark:hover:border-zinc-600",
                    )}
                    style={
                      selected
                        ? {
                            borderColor: accent,
                            boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 35%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <CardHeader className="pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {preset.label}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-zinc-500">
                            {preset.description}
                          </p>
                        </div>
                        {selected ? (
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: accent }}
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DesignThemePreviewCard
                        themeId={themeId}
                        primaryColor={accent}
                        saleMode={design.saleMode}
                      />
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>

          {preview ? (
            <div className="xl:col-span-2">
              <DesignCatalogInlinePreview
                store={preview.store}
                products={preview.products}
                exchangeRate={preview.exchangeRate}
                exchangeRateUpdatedAt={preview.exchangeRateUpdatedAt}
                baseSettings={preview.baseSettings}
                design={design}
              />
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Modo de venta"
        description="Define si priorizas conversión rápida o presentación visual del producto."
        variant="payments"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CATALOG_SALE_MODE_IDS.map((modeId) => {
            const preset = CATALOG_SALE_MODE_PRESETS[modeId];
            const selected = design.saleMode === modeId;
            const isFieldSaving = savingField === modeId;
            const accent =
              CATALOG_THEME_PRESETS[design.theme].primaryColor;

            return (
              <button
                key={modeId}
                type="button"
                onClick={() => setSaleMode(modeId)}
                disabled={isSaving && isFieldSaving}
                className="text-left"
              >
                <Card
                  className={cn(
                    "h-full transition",
                    selected
                      ? "border-emerald-600 ring-1 ring-emerald-600/30 dark:border-emerald-500"
                      : "hover:border-zinc-300 dark:hover:border-zinc-600",
                  )}
                >
                  <CardHeader className="pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {modeId === "quick" ? (
                          <Zap
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <Sparkles
                            className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {preset.label}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-zinc-500">
                            {preset.description}
                          </p>
                        </div>
                      </div>
                      {selected ? (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SaleModePreview mode={modeId} primaryColor={accent} />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Preferencias de visibilidad"
        description="Controla qué información ven tus clientes. El diseño se reajusta sin dejar espacios vacíos."
        variant="payments"
      >
        <div className="general-settings-card divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Stock
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Muestra u oculta indicadores de disponibilidad y agotado.
              </p>
            </div>
            <SettingsSwitch
              id="visibility-stock"
              label="Mostrar stock"
              checked={design.visibility.showStock}
              onChange={(value) => setVisibility("showStock", value)}
              disabled={isSaving && savingField === "showStock"}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Descripción
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Texto breve debajo del nombre del producto.
              </p>
            </div>
            <SettingsSwitch
              id="visibility-description"
              label="Mostrar descripción"
              checked={design.visibility.showDescription}
              onChange={(value) => setVisibility("showDescription", value)}
              disabled={isSaving && savingField === "showDescription"}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex items-start gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Precios
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Montos en USD y conversión a Bs en las tarjetas.
                </p>
              </div>
              {!design.visibility.showPrices ? (
                <EyeOff
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
                  aria-hidden="true"
                />
              ) : (
                <Eye
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <SettingsSwitch
              id="visibility-prices"
              label="Mostrar precios"
              checked={design.visibility.showPrices}
              onChange={(value) => setVisibility("showPrices", value)}
              disabled={isSaving && savingField === "showPrices"}
            />
          </div>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
