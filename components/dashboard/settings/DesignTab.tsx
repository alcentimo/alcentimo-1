"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ChevronDown, Eye } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CatalogPrimaryColorField } from "@/components/dashboard/settings/CatalogPrimaryColorField";
import { CatalogPromoBannerField } from "@/components/dashboard/settings/CatalogPromoBannerField";
import { SettingsTabShell } from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { DesignCatalogInlinePreview } from "@/components/dashboard/settings/DesignCatalogInlinePreview";
import { StorePublicLinkBar } from "@/components/dashboard/settings/StorePublicLinkBar";
import { saveCatalogDesignSettings } from "@/lib/settings/actions";
import {
  CATALOG_THEME_PRESETS,
  getCatalogThemeIdsForRubro,
} from "@/lib/store-settings/catalog-theme-presets";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import { getRubroPalette } from "@/lib/store-settings/rubro-palettes";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { Store } from "@/lib/database.types";
import type {
  CatalogDesignSettings,
  CatalogPromoBannerSettings,
  CatalogThemeId,
  CatalogVisibilitySettings,
} from "@/lib/store-settings/types";
import {
  defaultPromoBannerSettings,
  normalizePromoBannerDraft,
} from "@/lib/store-settings/promo-banner";
import { cn } from "@/lib/cn";
import {
  DEFAULT_STORE_RUBRO,
  normalizeStoreRubro,
} from "@/src/config/categories";

interface DesignTabPreviewContext {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  baseSettings: CatalogPreviewSettings;
}

interface DesignTabProps {
  initialDesign: CatalogDesignSettings;
  storeRubro?: string | null;
  preview?: DesignTabPreviewContext | null;
  catalogLink?: {
    slug: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null;
}

type SavingField =
  | CatalogThemeId
  | keyof CatalogVisibilitySettings
  | "primaryColor"
  | "promoBanner"
  | null;

type AccordionSection = "theme" | "brandColor" | "promoBanner" | "visibility";

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
  tagline?: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  accent?: string;
  onClick: () => void;
}

function DesignOption({
  label,
  tagline,
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
            {tagline ? (
              <span className="ml-1.5 text-xs font-normal text-zinc-500">
                ({tagline})
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

export function DesignTab({
  initialDesign,
  storeRubro: storeRubroProp = null,
  preview = null,
  catalogLink = null,
}: DesignTabProps) {
  const [design, setDesign] = useState(initialDesign);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [openSection, setOpenSection] = useState<AccordionSection>("theme");
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [isSaving, startSave] = useTransition();
  const colorSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promoBannerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeRubro = normalizeStoreRubro(
    storeRubroProp ?? preview?.store.rubro_tienda ?? DEFAULT_STORE_RUBRO,
  );
  const rubroPalette = useMemo(() => getRubroPalette(storeRubro), [storeRubro]);
  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, storeRubro),
    [design, storeRubro],
  );
  const isFashionStore = storeRubro === "ropa-moda";
  const availableThemeIds = useMemo(
    () => getCatalogThemeIdsForRubro(storeRubro),
    [storeRubro],
  );

  const persist = useCallback(
    (nextDesign: CatalogDesignSettings, field: SavingField) => {
      setError(null);
      setSavingField(field);

      startSave(async () => {
        try {
          const result = await saveCatalogDesignSettings(nextDesign);
          if (result.error) {
            setError(result.error);
            setDesign(initialDesign);
          }
        } finally {
          setSavingField(null);
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
      promoBanner: patch.promoBanner ?? design.promoBanner,
    };
    setDesign(nextDesign);
    persist(nextDesign, field);
  }

  function setTheme(theme: CatalogThemeId) {
    if (theme === design.theme) return;
    updateDesign({ theme }, theme);
  }

  useEffect(() => {
    if (!availableThemeIds.includes(design.theme)) {
      setTheme(availableThemeIds[0]);
    }
    // Solo al montar / cambiar rubro de tienda: alinea tema guardado al set permitido.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional
  }, [storeRubro]);

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

  function schedulePrimaryColorSave(nextDesign: CatalogDesignSettings) {
    if (colorSaveTimerRef.current) {
      clearTimeout(colorSaveTimerRef.current);
    }

    colorSaveTimerRef.current = setTimeout(() => {
      persist(nextDesign, "primaryColor");
    }, 400);
  }

  function setPrimaryColor(hex: string) {
    const nextDesign: CatalogDesignSettings = {
      ...design,
      primaryColor: hex,
    };
    setDesign(nextDesign);
    schedulePrimaryColorSave(nextDesign);
  }

  function schedulePromoBannerSave(nextDesign: CatalogDesignSettings) {
    if (promoBannerSaveTimerRef.current) {
      clearTimeout(promoBannerSaveTimerRef.current);
    }

    promoBannerSaveTimerRef.current = setTimeout(() => {
      persist(nextDesign, "promoBanner");
    }, 400);
  }

  function setPromoBanner(
    next: CatalogPromoBannerSettings,
    shouldSave = true,
  ) {
    const draft = normalizePromoBannerDraft(next);
    const nextDesign: CatalogDesignSettings = {
      ...design,
      promoBanner: draft,
    };
    setDesign(nextDesign);
    if (shouldSave) {
      schedulePromoBannerSave(nextDesign);
    }
  }

  function resetPrimaryColor() {
    if (colorSaveTimerRef.current) {
      clearTimeout(colorSaveTimerRef.current);
    }

    const nextDesign = { ...design };
    delete nextDesign.primaryColor;
    setDesign(nextDesign);
    persist(nextDesign, "primaryColor");
  }

  useEffect(() => {
    return () => {
      if (colorSaveTimerRef.current) {
        clearTimeout(colorSaveTimerRef.current);
      }
      if (promoBannerSaveTimerRef.current) {
        clearTimeout(promoBannerSaveTimerRef.current);
      }
    };
  }, []);

  function toggleSection(section: AccordionSection) {
    setOpenSection(section);
  }

  const themeSummary = CATALOG_THEME_PRESETS[design.theme]?.label ?? "Tema";
  const brandColorSummary = design.primaryColor
    ? design.primaryColor.toUpperCase()
    : `Rubro ${rubroPalette.label}`;
  const promoBannerSettings = normalizePromoBannerDraft(
    design.promoBanner ?? defaultPromoBannerSettings(),
  );
  const savedSlideCount = promoBannerSettings.slides.filter((slide) =>
    slide.mobileImageUrl.startsWith("http"),
  ).length;
  const promoBannerSummary = promoBannerSettings.enabled
    ? promoBannerSettings.slides.length > 0
      ? savedSlideCount > 0
        ? `${savedSlideCount} imagen(es)`
        : `${promoBannerSettings.slides.length} borrador(es)`
      : "Activado · sin imágenes"
    : "Desactivado";
  const visibilitySummary =
    [
      design.visibility.showStock && "Stock",
      design.visibility.showDescription && "Descripción",
      design.visibility.showPrices && "Precios",
    ]
      .filter(Boolean)
      .join(", ") || "Oculto";

  const previewPanel = preview ? (
    <DesignCatalogInlinePreview
      store={preview.store}
      exchangeRate={preview.exchangeRate}
      exchangeRateUpdatedAt={preview.exchangeRateUpdatedAt}
      baseSettings={preview.baseSettings}
      design={design}
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
  );

  return (
    <SettingsTabShell error={error} hideSaveBar>
      {catalogLink ? (
        <div className="mb-5 overflow-hidden rounded-xl border border-zinc-200/70 dark:border-zinc-800/70">
          <StorePublicLinkBar
            slug={catalogLink.slug}
            customDomain={catalogLink.customDomain}
            customDomainVerified={catalogLink.customDomainVerified}
            className="border-b-0"
          />
        </div>
      ) : null}
      <div className="design-studio">
        <aside className="design-studio-sidebar">
          <div className="design-studio-sidebar-header">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Estilo del catálogo
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {isFashionStore
                  ? "Tres looks profesionales para moda. Elige uno y se aplica al instante en tu catálogo."
                  : "Se guarda automáticamente al cambiar una opción."}
              </p>
            </div>
            <SavingHint visible={isSaving} />
          </div>

          <div className="design-studio-accordions">
            <DesignAccordion
              title="Tema visual"
              summary={themeSummary}
              open={openSection === "theme"}
              onToggle={() => toggleSection("theme")}
            >
              <div className="space-y-1">
                {isFashionStore ? (
                  <p className="mb-2 text-xs leading-relaxed text-zinc-500">
                    Minimalista, Neutro Cálido o Editorial Oscuro — paletas fijas
                    con contraste automático.
                  </p>
                ) : null}
                {availableThemeIds.map((themeId) => {
                  const preset = CATALOG_THEME_PRESETS[themeId];
                  return (
                    <DesignOption
                      key={themeId}
                      label={preset.label}
                      tagline={preset.tagline}
                      description={preset.description}
                      selected={design.theme === themeId}
                      accent={preset.previewAccent}
                      disabled={isSaving && savingField === themeId}
                      onClick={() => setTheme(themeId)}
                    />
                  );
                })}
              </div>
            </DesignAccordion>

            <DesignAccordion
              title="Color de marca"
              summary={brandColorSummary}
              open={openSection === "brandColor"}
              onToggle={() => toggleSection("brandColor")}
            >
              <CatalogPrimaryColorField
                color={design.primaryColor}
                effectiveColor={resolvedDesign.primaryColor}
                rubroLabel={rubroPalette.label}
                disabled={isSaving && savingField === "primaryColor"}
                onPick={setPrimaryColor}
                onReset={resetPrimaryColor}
              />
            </DesignAccordion>

            <DesignAccordion
              title="Banner promocional"
              summary={promoBannerSummary}
              open={openSection === "promoBanner"}
              onToggle={() => toggleSection("promoBanner")}
            >
              <CatalogPromoBannerField
                value={design.promoBanner}
                onChange={setPromoBanner}
              />
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

        {preview ? (
          <>
            <button
              type="button"
              className="design-studio-preview-fab"
              aria-haspopup="dialog"
              onClick={() => setPreviewSheetOpen(true)}
            >
              <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
              Ver vista previa
            </button>

            <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
              <SheetContent
                className="design-studio-preview-sheet"
                onClose={() => setPreviewSheetOpen(false)}
              >
                <SheetHeader className="design-studio-preview-sheet-header">
                  <SheetTitle>Vista previa del catálogo</SheetTitle>
                  <SheetDescription>
                    Vista previa según el rubro de tu tienda en Identidad. Los
                    cambios de diseño se reflejan al instante.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="design-studio-preview-sheet-body">
                  {previewPanel}
                </SheetBody>
              </SheetContent>
            </Sheet>
          </>
        ) : null}

        <main
          id="design-studio-preview-panel"
          className="design-studio-main design-studio-main--desktop"
        >
          {previewPanel}
        </main>
      </div>
    </SettingsTabShell>
  );
}
