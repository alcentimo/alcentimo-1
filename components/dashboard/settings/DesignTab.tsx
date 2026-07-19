"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { SettingsTabShell } from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { DesignCatalogInlinePreview } from "@/components/dashboard/settings/DesignCatalogInlinePreview";
import { saveCatalogDesignSettings } from "@/lib/settings/actions";
import {
  CATALOG_SALE_MODE_IDS,
  CATALOG_SALE_MODE_PRESETS,
  CATALOG_THEME_IDS,
  CATALOG_THEME_PRESETS,
} from "@/lib/store-settings/catalog-theme-presets";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { Store } from "@/lib/database.types";
import type {
  CatalogDesignSettings,
  CatalogSaleMode,
  CatalogThemeId,
  CatalogVisibilitySettings,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/select";
import {
  normalizeStoreRubro,
  STORE_RUBRO_OPTIONS,
  type StoreRubro,
} from "@/src/config/categories";

interface DesignTabPreviewContext {
  store: Store;
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

type AccordionSection = "theme" | "sale" | "visibility";

interface DesignAccordionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function DesignAccordion({
  title,
  summary,
  open,
  onToggle,
  children,
}: DesignAccordionProps) {
  return (
    <section className="design-accordion">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="design-accordion-trigger"
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {title}
          </span>
          {!open ? (
            <span className="mt-0.5 block truncate text-xs text-zinc-500">
              {summary}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="design-accordion-panel">{children}</div> : null}
    </section>
  );
}

interface DesignOptionProps {
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  accent?: string;
  onClick: () => void;
}

function DesignOption({
  label,
  description,
  selected,
  disabled = false,
  accent,
  onClick,
}: DesignOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("design-option", selected && "design-option-selected")}
      style={
        selected && accent
          ? {
              borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${accent} 6%, white)`,
            }
          : undefined
      }
    >
      <span className="flex min-w-0 flex-1 items-start gap-2.5">
        {accent ? (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 text-left">
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

export function DesignTab({ initialDesign, preview = null }: DesignTabProps) {
  const [design, setDesign] = useState(initialDesign);
  const [previewRubro, setPreviewRubro] = useState<StoreRubro>(() =>
    normalizeStoreRubro(preview?.store.rubro_tienda ?? "general"),
  );
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [openSection, setOpenSection] = useState<AccordionSection>("theme");
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

  function toggleSection(section: AccordionSection) {
    setOpenSection(section);
  }

  const themeSummary = CATALOG_THEME_PRESETS[design.theme].label;
  const saleSummary = CATALOG_SALE_MODE_PRESETS[design.saleMode].label;
  const visibilitySummary =
    [
      design.visibility.showStock && "Stock",
      design.visibility.showDescription && "Descripción",
      design.visibility.showPrices && "Precios",
    ]
      .filter(Boolean)
      .join(", ") || "Oculto";

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <div className="design-studio">
        <aside className="design-studio-sidebar">
          <div className="design-studio-sidebar-header">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Estilo del catálogo
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Se guarda automáticamente al cambiar una opción.
              </p>
            </div>
            <SavingHint visible={isSaving} />
          </div>

          <div className="design-studio-accordions">
            <div className="design-preview-rubro-picker">
              <label htmlFor="design-preview-rubro" className="design-preview-rubro-label">
                Viendo catálogo de:
              </label>
              <Select
                id="design-preview-rubro"
                value={previewRubro}
                onChange={(event) =>
                  setPreviewRubro(normalizeStoreRubro(event.target.value))
                }
                className="design-preview-rubro-select"
                aria-describedby="design-preview-rubro-hint"
              >
                {STORE_RUBRO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p id="design-preview-rubro-hint" className="design-preview-rubro-hint">
                Solo vista previa. No cambia el rubro de tu tienda en Perfil de
                Empresa.
              </p>
            </div>

            <DesignAccordion
              title="Tema"
              summary={themeSummary}
              open={openSection === "theme"}
              onToggle={() => toggleSection("theme")}
            >
              <div className="space-y-1">
                {CATALOG_THEME_IDS.map((themeId) => {
                  const preset = CATALOG_THEME_PRESETS[themeId];
                  return (
                    <DesignOption
                      key={themeId}
                      label={preset.label}
                      description={preset.description}
                      selected={design.theme === themeId}
                      accent={preset.primaryColor}
                      disabled={isSaving && savingField === themeId}
                      onClick={() => setTheme(themeId)}
                    />
                  );
                })}
              </div>
            </DesignAccordion>

            <DesignAccordion
              title="Modo de venta"
              summary={saleSummary}
              open={openSection === "sale"}
              onToggle={() => toggleSection("sale")}
            >
              <div className="space-y-1">
                {CATALOG_SALE_MODE_IDS.map((modeId) => {
                  const preset = CATALOG_SALE_MODE_PRESETS[modeId];
                  return (
                    <DesignOption
                      key={modeId}
                      label={preset.label}
                      description={preset.description}
                      selected={design.saleMode === modeId}
                      disabled={isSaving && savingField === modeId}
                      onClick={() => setSaleMode(modeId)}
                    />
                  );
                })}
              </div>
            </DesignAccordion>

            <DesignAccordion
              title="Visibilidad"
              summary={visibilitySummary}
              open={openSection === "visibility"}
              onToggle={() => toggleSection("visibility")}
            >
              <div className="design-visibility-list">
                <div className="design-visibility-row">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Stock
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Disponibilidad y agotado
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
                <div className="design-visibility-row">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Descripción
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Texto bajo el nombre
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
                <div className="design-visibility-row">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Precios
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      USD y conversión a Bs
                    </p>
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
            </DesignAccordion>
          </div>
        </aside>

        <main className="design-studio-main">
          {preview ? (
            <DesignCatalogInlinePreview
              store={preview.store}
              exchangeRate={preview.exchangeRate}
              exchangeRateUpdatedAt={preview.exchangeRateUpdatedAt}
              baseSettings={preview.baseSettings}
              design={design}
              previewRubro={previewRubro}
            />
          ) : (
            <div className="design-studio-preview-empty">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Vista previa no disponible
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Configura tu tienda para ver cómo se verá el catálogo.
              </p>
            </div>
          )}
        </main>
      </div>
    </SettingsTabShell>
  );
}
