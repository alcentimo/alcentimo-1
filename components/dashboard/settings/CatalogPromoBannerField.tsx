"use client";

import { Plus, Trash2 } from "lucide-react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
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
    emit(
      {
        ...promoBanner,
        slides: promoBanner.slides.filter((slide) => slide.id !== slideId),
      },
      true,
    );
  }

  function addSlide() {
    if (!canAddSlide) return;

    emit(
      {
        ...promoBanner,
        slides: [
          ...promoBanner.slides,
          {
            id: createPromoBannerSlideId(),
            mobileImageUrl: "",
          },
        ],
      },
      false,
    );
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
            Sube imágenes panorámicas para el carrusel. Se optimizan
            automáticamente para móvil y escritorio.
          </p>

          {promoBanner.slides.length === 0 ? (
            <button
              type="button"
              onClick={addSlide}
              className="design-promo-banner-add-btn"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Añadir imagen al carrusel
            </button>
          ) : (
            <>
              <ul className="design-promo-banner-list">
                {promoBanner.slides.map((slide, index) => (
                  <li key={slide.id} className="design-promo-banner-card">
                    <div className="design-promo-banner-card-main">
                      <CatalogBannerImageUpload
                        id={`promo-banner-mobile-${slide.id}`}
                        label={`Imagen ${index + 1}`}
                        variant="mobile"
                        layout="compact"
                        value={slide.mobileImageUrl}
                        required
                        onChange={(mobileImageUrl) =>
                          updateSlide(slide.id, { mobileImageUrl }, true)
                        }
                      />

                      <div className="design-promo-banner-card-link">
                        <label
                          htmlFor={`promo-banner-link-${slide.id}`}
                          className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Enlace (opcional)
                        </label>
                        <input
                          id={`promo-banner-link-${slide.id}`}
                          type="url"
                          value={slide.linkUrl ?? ""}
                          onChange={(event) =>
                            updateSlide(
                              slide.id,
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

                    <button
                      type="button"
                      onClick={() => removeSlide(slide.id)}
                      className="design-promo-banner-card-delete"
                      aria-label={`Eliminar imagen ${index + 1} del carrusel`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              {canAddSlide ? (
                <button
                  type="button"
                  onClick={addSlide}
                  className="design-promo-banner-add-btn"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Añadir otra imagen al carrusel
                </button>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Límite alcanzado: máximo {MAX_PROMO_BANNER_SLIDES} imágenes por
                  carrusel.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
