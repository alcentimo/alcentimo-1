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
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Maximize2,
  Palette,
  Save,
  X,
} from "lucide-react";
import { CatalogPrimaryColorField } from "@/components/dashboard/settings/CatalogPrimaryColorField";
import { CatalogPromoBannerField } from "@/components/dashboard/settings/CatalogPromoBannerField";
import { CatalogHeaderField } from "@/components/dashboard/settings/CatalogHeaderField";
import { StoreLogoUploadField } from "@/components/dashboard/settings/StoreLogoUploadField";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import { SettingsTabShell } from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { DesignCatalogInlinePreview } from "@/components/dashboard/settings/DesignCatalogInlinePreview";
import { StorePublicLinkBar } from "@/components/dashboard/settings/StorePublicLinkBar";
import { saveCatalogDesignSettings } from "@/lib/settings/actions";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import { getRubroPalette } from "@/lib/store-settings/rubro-palettes";
import type { CatalogPreviewSettings } from "@/lib/catalog/catalog-preview-types";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type {
  CatalogDesignSettings,
  CatalogHeaderSettings,
  CatalogPromoBannerSettings,
  CheckoutSettings,
} from "@/lib/store-settings/types";
import {
  defaultPromoBannerSettings,
  normalizePromoBannerDraft,
} from "@/lib/store-settings/promo-banner";
import {
  catalogHeaderSummary,
  defaultCatalogHeaderSettings,
  normalizeCatalogHeaderDraft,
} from "@/lib/store-settings/catalog-header";
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
  catalogProducts?: CatalogListItem[];
}

interface DesignTabProps {
  initialDesign: CatalogDesignSettings;
  /** Conservado por compatibilidad con SettingsPanel; el checkout ya no se edita aquí. */
  initialCheckout: CheckoutSettings;
  storeRubro?: string | null;
  preview?: DesignTabPreviewContext | null;
  products?: CouponProductOption[];
  catalogLink?: {
    slug: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null;
}

type SavingField = "primaryColor" | "promoBanner" | "header" | "logo" | "manual" | null;
type AccordionSection = "brandColor" | "logo" | "banner";

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
    <section className={cn("design-accordion", open && "design-accordion-open")}>
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
            "design-accordion-chevron h-4 w-4 shrink-0 text-zinc-400",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="design-accordion-panel">{children}</div> : null}
    </section>
  );
}

export function DesignTab({
  initialDesign,
  initialCheckout: _initialCheckout,
  storeRubro: storeRubroProp = null,
  preview = null,
  products = [],
  catalogLink = null,
}: DesignTabProps) {
  const [design, setDesign] = useState(initialDesign);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    preview?.store.logo_url ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [openSection, setOpenSection] = useState<AccordionSection | null>(
    "brandColor",
  );
  const [studioOpen, setStudioOpen] = useState(true);
  const [portalReady, setPortalReady] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  );
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isSaving, startSave] = useTransition();
  const colorSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promoBannerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const headerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const designRef = useRef(design);

  designRef.current = design;

  const storeRubro = normalizeStoreRubro(
    storeRubroProp ?? preview?.store.rubro_tienda ?? DEFAULT_STORE_RUBRO,
  );
  const rubroPalette = useMemo(() => getRubroPalette(storeRubro), [storeRubro]);
  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, storeRubro),
    [design, storeRubro],
  );

  const previewStore = useMemo(() => {
    if (!preview?.store) return null;
    return { ...preview.store, logo_url: logoUrl };
  }, [preview?.store, logoUrl]);

  useEffect(() => {
    setLogoUrl(preview?.store.logo_url ?? null);
  }, [preview?.store.logo_url]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      const compact = media.matches;
      setCompactLayout(compact);
      if (!compact) {
        setMobilePreviewOpen(false);
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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

  function clearPendingTimers() {
    if (colorSaveTimerRef.current) {
      clearTimeout(colorSaveTimerRef.current);
      colorSaveTimerRef.current = null;
    }
    if (promoBannerSaveTimerRef.current) {
      clearTimeout(promoBannerSaveTimerRef.current);
      promoBannerSaveTimerRef.current = null;
    }
    if (headerSaveTimerRef.current) {
      clearTimeout(headerSaveTimerRef.current);
      headerSaveTimerRef.current = null;
    }
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

  function scheduleHeaderSave(nextDesign: CatalogDesignSettings) {
    if (headerSaveTimerRef.current) {
      clearTimeout(headerSaveTimerRef.current);
    }
    headerSaveTimerRef.current = setTimeout(() => {
      persist(nextDesign, "header");
    }, 400);
  }

  function setHeader(next: CatalogHeaderSettings, shouldSave = true) {
    const draft = normalizeCatalogHeaderDraft(next);
    const nextDesign: CatalogDesignSettings = {
      ...design,
      header: draft,
    };
    setDesign(nextDesign);
    if (shouldSave) {
      scheduleHeaderSave(nextDesign);
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
      clearPendingTimers();
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!studioOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [studioOpen]);

  useEffect(() => {
    if (!studioOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (mobilePreviewOpen) {
        setMobilePreviewOpen(false);
        return;
      }
      setStudioOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [studioOpen, mobilePreviewOpen]);

  function toggleSection(section: AccordionSection) {
    setOpenSection((current) => (current === section ? null : section));
  }

  function flashSaved() {
    setSavedFlash(true);
    if (savedFlashTimerRef.current) {
      clearTimeout(savedFlashTimerRef.current);
    }
    savedFlashTimerRef.current = setTimeout(() => {
      setSavedFlash(false);
    }, 1800);
  }

  function handleManualSave() {
    clearPendingTimers();
    const nextDesign = designRef.current;
    setError(null);
    setSavingField("manual");

    startSave(async () => {
      try {
        const designResult = await saveCatalogDesignSettings(nextDesign);
        if (designResult.error) {
          setError(designResult.error);
          setDesign(initialDesign);
          return;
        }
        flashSaved();
      } finally {
        setSavingField(null);
      }
    });
  }

  function closeStudio() {
    clearPendingTimers();
    persist(designRef.current, "manual");
    setMobilePreviewOpen(false);
    setStudioOpen(false);
  }

  const brandColorSummary = design.primaryColor
    ? design.primaryColor.toUpperCase()
    : `Rubro ${rubroPalette.label}`;
  const headerSettings = normalizeCatalogHeaderDraft(
    design.header ?? defaultCatalogHeaderSettings(),
  );
  const headerSummary = catalogHeaderSummary(headerSettings);
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
  const bannerSummary = [headerSummary, promoBannerSummary]
    .filter(Boolean)
    .join(" · ");
  const logoSummary = logoUrl ? "Logo cargado" : "Sin logo";

  const controlsPanel = (
    <div className="design-studio-accordions">
      <div className="design-marketplace-lock mb-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          Vitrina fija: Mercado Oculto
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
          Todas las tiendas usan el mismo layout marketplace (estilo Mercado
          Libre). Solo personalizas color, logo y banners.
        </p>
      </div>

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
        title="Logo"
        summary={logoSummary}
        open={openSection === "logo"}
        onToggle={() => toggleSection("logo")}
      >
        {previewStore ? (
          <StoreLogoUploadField
            logoUrl={logoUrl}
            storeName={previewStore.name}
            disabled={isSaving && savingField === "logo"}
            onLogoChange={(url) => {
              setLogoUrl(url);
              setSavingField("logo");
              setTimeout(() => setSavingField(null), 400);
            }}
          />
        ) : (
          <p className="text-xs text-zinc-500">
            Abre Identidad si aún no tienes tienda cargada.
          </p>
        )}
      </DesignAccordion>

      <DesignAccordion
        title="Banner"
        summary={bannerSummary}
        open={openSection === "banner"}
        onToggle={() => toggleSection("banner")}
      >
        <div className="space-y-5">
          <CatalogHeaderField
            value={design.header}
            brandColor={resolvedDesign.primaryColor}
            disabled={isSaving && savingField === "header"}
            onChange={setHeader}
          />
          <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Carrusel promocional
            </p>
            <CatalogPromoBannerField
              value={design.promoBanner}
              onChange={setPromoBanner}
              products={products}
            />
          </div>
        </div>
      </DesignAccordion>
    </div>
  );

  const previewPanel =
    preview && previewStore ? (
      <DesignCatalogInlinePreview
        store={previewStore}
        exchangeRate={preview.exchangeRate}
        exchangeRateUpdatedAt={preview.exchangeRateUpdatedAt}
        baseSettings={preview.baseSettings}
        design={design}
        storeProducts={preview.catalogProducts ?? []}
        variant="immersive"
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

  const immersiveStudio =
    portalReady && studioOpen
      ? createPortal(
          <div
            className={cn(
              "design-studio-immersive",
              compactLayout && "design-studio-immersive--compact",
              mobilePreviewOpen && "design-studio-immersive--preview-open",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="design-studio-immersive-title"
          >
            <header className="design-studio-immersive-header">
              <div className="design-studio-immersive-header-start">
                <button
                  type="button"
                  className="design-studio-immersive-exit"
                  onClick={closeStudio}
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Volver al panel</span>
                </button>
                <div className="min-w-0">
                  <h2
                    id="design-studio-immersive-title"
                    className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:text-base"
                  >
                    Diseño del catálogo
                  </h2>
                  <p className="mt-0.5 hidden truncate text-xs text-zinc-500 sm:block">
                    Misma vitrina que tu tienda pública · cambios al instante
                  </p>
                </div>
              </div>

              <div className="design-studio-immersive-header-actions">
                <SavingHint visible={isSaving && !savedFlash} />
                {savedFlash ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Guardado
                  </span>
                ) : null}
                <button
                  type="button"
                  className="design-studio-immersive-save"
                  onClick={handleManualSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Guardar
                </button>
              </div>
            </header>

            {error ? (
              <div className="design-studio-immersive-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="design-studio-immersive-body">
              <aside className="design-studio-immersive-sidebar">
                <div className="design-studio-immersive-sidebar-intro">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Branding
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    Color, logo y banners. La estructura visual es fija
                    (marketplace).
                  </p>
                </div>
                {controlsPanel}
              </aside>

              {!compactLayout ? (
                <main className="design-studio-immersive-preview">
                  {previewPanel}
                </main>
              ) : null}
            </div>

            {compactLayout ? (
              <>
                <button
                  type="button"
                  className="design-studio-preview-fab"
                  onClick={() => setMobilePreviewOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={mobilePreviewOpen}
                >
                  <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Ver vista previa del cliente
                </button>

                {mobilePreviewOpen ? (
                  <div
                    className="design-studio-mobile-preview-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="design-studio-mobile-preview-title"
                  >
                    <header className="design-studio-mobile-preview-modal-header">
                      <div className="min-w-0 flex-1">
                        <h3
                          id="design-studio-mobile-preview-title"
                          className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                        >
                          Vista previa del cliente
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          Igual que tu tienda pública en móvil
                        </p>
                      </div>
                      <button
                        type="button"
                        className="design-studio-mobile-preview-modal-close"
                        onClick={() => setMobilePreviewOpen(false)}
                      >
                        <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Cerrar
                      </button>
                    </header>
                    <div className="design-studio-mobile-preview-modal-body">
                      {previewPanel}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <SettingsTabShell error={studioOpen ? null : error} hideSaveBar>
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

      <section className="design-studio-entry">
        <div className="design-studio-entry-icon" aria-hidden="true">
          <Palette className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Editor de diseño del catálogo
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            Vitrina marketplace fija. Personaliza color de marca, logo y banner;
            la vista previa usa el mismo componente que tu tienda pública.
          </p>
          <dl className="design-studio-entry-meta mt-3">
            <div>
              <dt>Modelo</dt>
              <dd>Mercado Oculto</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{brandColorSummary}</dd>
            </div>
            <div>
              <dt>Logo</dt>
              <dd>{logoSummary}</dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          className="design-studio-entry-open"
          onClick={() => setStudioOpen(true)}
        >
          <Maximize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Abrir editor
        </button>
      </section>

      {immersiveStudio}
    </SettingsTabShell>
  );
}
