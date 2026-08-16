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
import { CatalogFaqField } from "@/components/dashboard/settings/CatalogFaqField";
import { CatalogHeaderField } from "@/components/dashboard/settings/CatalogHeaderField";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import { SettingsTabShell } from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { DesignCatalogInlinePreview } from "@/components/dashboard/settings/DesignCatalogInlinePreview";
import { StorePublicLinkBar } from "@/components/dashboard/settings/StorePublicLinkBar";
import { saveCatalogDesignSettings, saveCheckoutSettings } from "@/lib/settings/actions";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import { getRubroPalette } from "@/lib/store-settings/rubro-palettes";
import { normalizeCheckoutType } from "@/lib/store-settings/defaults";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { Store } from "@/lib/database.types";
import type {
  CatalogDesignSettings,
  CatalogFaqSettings,
  CatalogHeaderSettings,
  CatalogPromoBannerSettings,
  CatalogVisibilitySettings,
  CheckoutSettings,
  CheckoutType,
} from "@/lib/store-settings/types";
import {
  defaultPromoBannerSettings,
  normalizePromoBannerDraft,
} from "@/lib/store-settings/promo-banner";
import {
  defaultCatalogFaqSettings,
  normalizeCatalogFaqDraft,
} from "@/lib/store-settings/catalog-faq";
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
}

interface DesignTabProps {
  initialDesign: CatalogDesignSettings;
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

type SavingField =
  | keyof CatalogVisibilitySettings
  | "primaryColor"
  | "promoBanner"
  | "faq"
  | "header"
  | "checkout"
  | "manual"
  | null;

type AccordionSection =
  | "brandColor"
  | "header"
  | "promoBanner"
  | "faq"
  | "visibility"
  | "checkout";

const CHECKOUT_MODE_OPTIONS: {
  value: CheckoutType;
  label: string;
  tagline?: string;
  description: string;
}[] = [
  {
    value: "both",
    label: "Ambas opciones",
    tagline: "Predeterminado",
    description:
      'El cliente elige en el carrito entre "Finalizar pedido" (web) y "Pedir directo por WhatsApp".',
  },
  {
    value: "full_checkout",
    label: "Solo Checkout Completo",
    description:
      "Muestra únicamente el botón para llenar datos de envío y pago en la web.",
  },
  {
    value: "direct_whatsapp",
    label: "Solo WhatsApp Directo",
    description:
      "Muestra únicamente el botón para enviar el pedido directo a WhatsApp sin pedir formularios.",
  },
];

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
      aria-pressed={selected}
      className={cn("design-option", selected && "design-option-selected")}
    >
      <span
        className={cn(
          "design-option-radio",
          selected && "design-option-radio-selected",
        )}
        aria-hidden="true"
      >
        {selected ? <span className="design-option-radio-dot" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 items-start gap-2">
        {accent ? (
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 max-w-full flex-1 text-left">
          <span className="block break-words text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
            {tagline ? (
              <span className="ml-1.5 inline text-xs font-normal text-zinc-500">
                ({tagline})
              </span>
            ) : null}
          </span>
          <span className="mt-1 block break-words text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

export function DesignTab({
  initialDesign,
  initialCheckout,
  storeRubro: storeRubroProp = null,
  preview = null,
  products = [],
  catalogLink = null,
}: DesignTabProps) {
  const [design, setDesign] = useState(initialDesign);
  const [checkoutType, setCheckoutType] = useState<CheckoutType>(() =>
    normalizeCheckoutType(initialCheckout.checkoutType),
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
  const promoBannerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faqSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const designRef = useRef(design);
  const checkoutTypeRef = useRef(checkoutType);

  designRef.current = design;
  checkoutTypeRef.current = checkoutType;

  const storeRubro = normalizeStoreRubro(
    storeRubroProp ?? preview?.store.rubro_tienda ?? DEFAULT_STORE_RUBRO,
  );
  const rubroPalette = useMemo(() => getRubroPalette(storeRubro), [storeRubro]);
  const resolvedDesign = useMemo(
    () => resolveCatalogDesign(design, storeRubro),
    [design, storeRubro],
  );

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
    if (faqSaveTimerRef.current) {
      clearTimeout(faqSaveTimerRef.current);
      faqSaveTimerRef.current = null;
    }
    if (headerSaveTimerRef.current) {
      clearTimeout(headerSaveTimerRef.current);
      headerSaveTimerRef.current = null;
    }
  }

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
      faq: patch.faq ?? design.faq,
      header: patch.header ?? design.header,
    };
    setDesign(nextDesign);
    persist(nextDesign, field);
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

  function scheduleFaqSave(nextDesign: CatalogDesignSettings) {
    if (faqSaveTimerRef.current) {
      clearTimeout(faqSaveTimerRef.current);
    }

    faqSaveTimerRef.current = setTimeout(() => {
      persist(nextDesign, "faq");
    }, 400);
  }

  function setFaq(next: CatalogFaqSettings, shouldSave = true) {
    const draft = normalizeCatalogFaqDraft(next);
    const nextDesign: CatalogDesignSettings = {
      ...design,
      faq: draft,
    };
    setDesign(nextDesign);
    if (shouldSave) {
      scheduleFaqSave(nextDesign);
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

  function setCheckoutMode(nextType: CheckoutType) {
    if (nextType === checkoutType) return;
    setError(null);
    setCheckoutType(nextType);
    setSavingField("checkout");
    startSave(async () => {
      try {
        const result = await saveCheckoutSettings({
          accountMode: "hibrido",
          checkoutType: nextType,
        });
        if (result.error) {
          setError(result.error);
          setCheckoutType(normalizeCheckoutType(initialCheckout.checkoutType));
        }
      } finally {
        setSavingField(null);
      }
    });
  }

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
    const nextCheckout = checkoutTypeRef.current;
    setError(null);
    setSavingField("manual");

    startSave(async () => {
      try {
        const [designResult, checkoutResult] = await Promise.all([
          saveCatalogDesignSettings(nextDesign),
          saveCheckoutSettings({
            accountMode: "hibrido",
            checkoutType: nextCheckout,
          }),
        ]);
        if (designResult.error) {
          setError(designResult.error);
          setDesign(initialDesign);
          return;
        }
        if (checkoutResult.error) {
          setError(checkoutResult.error);
          setCheckoutType(normalizeCheckoutType(initialCheckout.checkoutType));
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
  const faqSettings = normalizeCatalogFaqDraft(
    design.faq ?? defaultCatalogFaqSettings(),
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
  const faqSummary = faqSettings.enabled
    ? faqSettings.items.filter((item) => item.question.trim()).length > 0
      ? `${faqSettings.items.filter((item) => item.question.trim()).length} pregunta(s)`
      : "Activado · sin preguntas"
    : "Desactivado";
  const visibilitySummary =
    [
      design.visibility.showStock && "Stock",
      design.visibility.showDescription && "Descripción",
      design.visibility.showPrices && "Precios",
    ]
      .filter(Boolean)
      .join(", ") || "Oculto";
  const checkoutSummary =
    CHECKOUT_MODE_OPTIONS.find((option) => option.value === checkoutType)
      ?.label ?? "Ambas opciones";

  const controlsPanel = (
    <div className="design-studio-accordions">
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
        title="Cabecera"
        summary={headerSummary}
        open={openSection === "header"}
        onToggle={() => toggleSection("header")}
      >
        <CatalogHeaderField
          value={design.header}
          brandColor={resolvedDesign.primaryColor}
          disabled={isSaving && savingField === "header"}
          onChange={setHeader}
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
          products={products}
        />
      </DesignAccordion>

      <DesignAccordion
        title="Preguntas frecuentes"
        summary={faqSummary}
        open={openSection === "faq"}
        onToggle={() => toggleSection("faq")}
      >
        <CatalogFaqField value={design.faq} onChange={setFaq} />
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
                Disponibilidad
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Mostrar si hay unidades o está agotado
              </p>
            </div>
            <SettingsSwitch
              id="visibility-stock"
              label="Mostrar disponibilidad"
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

      <DesignAccordion
        title="Modo de checkout y pedidos"
        summary={checkoutSummary}
        open={openSection === "checkout"}
        onToggle={() => toggleSection("checkout")}
      >
        <div className="design-option-list">
          <p className="mb-1 text-xs leading-relaxed text-zinc-500">
            Define cómo confirman el pedido tus clientes en el carrito del
            catálogo.
          </p>
          {CHECKOUT_MODE_OPTIONS.map((option) => (
            <DesignOption
              key={option.value}
              label={option.label}
              tagline={option.tagline}
              description={option.description}
              selected={checkoutType === option.value}
              disabled={isSaving && savingField === "checkout"}
              onClick={() => setCheckoutMode(option.value)}
            />
          ))}
        </div>
      </DesignAccordion>
    </div>
  );

  const previewPanel = preview ? (
    <DesignCatalogInlinePreview
      store={preview.store}
      exchangeRate={preview.exchangeRate}
      exchangeRateUpdatedAt={preview.exchangeRateUpdatedAt}
      baseSettings={preview.baseSettings}
      design={design}
      checkoutType={checkoutType}
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
                    Editor a pantalla completa · los cambios se aplican al instante
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
                    Estilo y opciones
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {compactLayout
                      ? "Ajusta color de marca, cabecera y visibilidad. Usa el botón de abajo para ver cómo queda el catálogo."
                      : "Color de marca, cabecera y checkout en un panel cómodo. El layout del catálogo es el modelo estándar marketplace."}
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
                          Así verán el catálogo en el celular
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
            Abre el estudio a pantalla completa para personalizar el color de
            marca, la cabecera y las opciones del catálogo. En el celular, la vista
            previa del cliente se abre cuando la necesites, sin ocupar el panel
            de ajustes.
          </p>
          <dl className="design-studio-entry-meta">
            <div>
              <dt>Modelo</dt>
              <dd>Marketplace</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{brandColorSummary}</dd>
            </div>
            <div>
              <dt>Checkout</dt>
              <dd>{checkoutSummary}</dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          className="design-studio-entry-cta"
          onClick={() => setStudioOpen(true)}
        >
          <Maximize2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Abrir editor a pantalla completa
        </button>
      </section>

      {immersiveStudio}
    </SettingsTabShell>
  );
}
