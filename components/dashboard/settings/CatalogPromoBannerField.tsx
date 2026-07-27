"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { cn } from "@/lib/cn";
import {
  MAX_PROMO_BANNER_SLIDES,
  createPromoBannerSlideId,
  defaultPromoBannerSettings,
  normalizePromoBannerDraft,
} from "@/lib/store-settings/promo-banner";
import type {
  CatalogPromoBannerSettings,
  CatalogPromoBannerSlide,
} from "@/lib/store-settings/types";

interface CatalogPromoBannerFieldProps {
  value?: CatalogPromoBannerSettings;
  onChange: (next: CatalogPromoBannerSettings, shouldSave?: boolean) => void;
}

export function CatalogPromoBannerField({
  value,
  onChange,
}: CatalogPromoBannerFieldProps) {
  const promoBanner = normalizePromoBannerDraft(
    value ?? defaultPromoBannerSettings(),
  );
  const canAddSlide = promoBanner.slides.length < MAX_PROMO_BANNER_SLIDES;
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);

  const activeSlide = promoBanner.slides.find(
    (slide) => slide.id === activeSlideId,
  );
  const activeSlideIndex = promoBanner.slides.findIndex(
    (slide) => slide.id === activeSlideId,
  );

  useEffect(() => {
    if (promoBanner.slides.length === 0) {
      setActiveSlideId(null);
      return;
    }

    if (
      !activeSlideId ||
      !promoBanner.slides.some((slide) => slide.id === activeSlideId)
    ) {
      setActiveSlideId(promoBanner.slides[0]?.id ?? null);
    }
  }, [activeSlideId, promoBanner.slides]);

  function emit(next: CatalogPromoBannerSettings, shouldSave = true) {
    onChange(normalizePromoBannerDraft(next), shouldSave);
  }

  function setEnabled(enabled: boolean) {
    emit({ ...promoBanner, enabled }, true);
  }

  function updateSlide(
    slideId: string,
    patch: Partial<CatalogPromoBannerSlide>,
    shouldSave = true,
  ) {
    emit(
      {
        ...promoBanner,
        slides: promoBanner.slides.map((slide) =>
          slide.id === slideId ? { ...slide, ...patch } : slide,
        ),
      },
      shouldSave,
    );
  }

  function removeSlide(slideId: string) {
    const remaining = promoBanner.slides.filter((slide) => slide.id !== slideId);

    emit(
      {
        ...promoBanner,
        slides: remaining,
      },
      true,
    );

    if (activeSlideId === slideId) {
      setActiveSlideId(remaining[0]?.id ?? null);
    }
  }

  function addSlide() {
    if (!canAddSlide) return;

    const id = createPromoBannerSlideId();

    emit(
      {
        ...promoBanner,
        slides: [
          ...promoBanner.slides,
          {
            id,
            mobileImageUrl: "",
          },
        ],
      },
      false,
    );
    setActiveSlideId(id);
  }

  return (
    <div className="design-promo-banner-panel">
      <div className="design-visibility-row">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Banner promocional
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Carrusel superior en el catálogo público
          </p>
        </div>
        <SettingsSwitch
          id="promo-banner-enabled"
          label="Activar banner promocional"
          checked={promoBanner.enabled}
          onChange={setEnabled}
        />
      </div>

      {promoBanner.enabled ? (
        <div className="design-promo-banner-slides">
          <p className="text-xs leading-relaxed text-zinc-500">
            Sube al menos una imagen para móvil. Opcionalmente añade otra para
            escritorio (recomendado 1600×400 px).
          </p>

          {promoBanner.slides.length === 0 ? (
            <div className="design-promo-banner-empty">
              <p className="text-xs text-zinc-500">
                Aún no hay imágenes en el carrusel.
              </p>
              <button
                type="button"
                onClick={addSlide}
                className="design-promo-banner-add inline-flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Añadir primera imagen
              </button>
            </div>
          ) : (
            <>
              <div
                className="design-promo-banner-tabs"
                role="tablist"
                aria-label="Imágenes del carrusel"
              >
                {promoBanner.slides.map((slide, index) => {
                  const isActive = slide.id === activeSlideId;
                  const thumbUrl =
                    slide.mobileImageUrl.trim() ||
                    slide.desktopImageUrl?.trim() ||
                    "";

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`promo-banner-panel-${slide.id}`}
                      id={`promo-banner-tab-${slide.id}`}
                      onClick={() => setActiveSlideId(slide.id)}
                      className={cn(
                        "design-promo-banner-tab",
                        isActive && "design-promo-banner-tab-active",
                      )}
                    >
                      {thumbUrl ? (
                        <span className="design-promo-banner-tab-thumb">
                          <Image
                            src={thumbUrl}
                            alt=""
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </span>
                      ) : null}
                      <span>Banner {index + 1}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={!canAddSlide}
                  onClick={addSlide}
                  className="design-promo-banner-tab design-promo-banner-tab-add"
                  aria-label="Añadir imagen al carrusel"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Añadir
                </button>
              </div>

              {!canAddSlide ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Límite alcanzado: máximo {MAX_PROMO_BANNER_SLIDES} imágenes
                  por carrusel.
                </p>
              ) : null}

              {activeSlide ? (
                <section
                  key={activeSlide.id}
                  id={`promo-banner-panel-${activeSlide.id}`}
                  role="tabpanel"
                  aria-labelledby={`promo-banner-tab-${activeSlide.id}`}
                  className="design-promo-banner-editor"
                >
                  <div className="design-promo-banner-slide-header">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Banner {activeSlideIndex + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeSlide(activeSlide.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>

                  <CatalogBannerImageUpload
                    id={`promo-banner-mobile-${activeSlide.id}`}
                    label="Móvil"
                    variant="mobile"
                    hint="Recomendado 960×384 px. Se recorta sin deformarse."
                    value={activeSlide.mobileImageUrl}
                    required
                    onChange={(mobileImageUrl) =>
                      updateSlide(activeSlide.id, { mobileImageUrl }, true)
                    }
                  />

                  <CatalogBannerImageUpload
                    id={`promo-banner-desktop-${activeSlide.id}`}
                    label="Escritorio"
                    variant="desktop"
                    hint="Recomendado 1600×400 px. Si no subes una, se usa la imagen móvil."
                    value={activeSlide.desktopImageUrl ?? ""}
                    onChange={(desktopImageUrl) =>
                      updateSlide(
                        activeSlide.id,
                        {
                          desktopImageUrl: desktopImageUrl || undefined,
                        },
                        true,
                      )
                    }
                  />

                  <div className="design-promo-banner-slide-fields">
                    <div>
                      <label
                        htmlFor={`promo-banner-alt-${activeSlide.id}`}
                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Texto alternativo
                      </label>
                      <input
                        id={`promo-banner-alt-${activeSlide.id}`}
                        type="text"
                        value={activeSlide.alt ?? ""}
                        onChange={(event) =>
                          updateSlide(
                            activeSlide.id,
                            {
                              alt: event.target.value || undefined,
                            },
                            true,
                          )
                        }
                        className="input-field mt-1 py-2 text-sm"
                        placeholder={`Promoción ${activeSlideIndex + 1}`}
                        maxLength={120}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`promo-banner-link-${activeSlide.id}`}
                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        Enlace (opcional)
                      </label>
                      <input
                        id={`promo-banner-link-${activeSlide.id}`}
                        type="url"
                        value={activeSlide.linkUrl ?? ""}
                        onChange={(event) =>
                          updateSlide(
                            activeSlide.id,
                            {
                              linkUrl: event.target.value || undefined,
                            },
                            true,
                          )
                        }
                        className="input-field mt-1 py-2 text-sm"
                        placeholder="https://… o /categorias"
                      />
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
