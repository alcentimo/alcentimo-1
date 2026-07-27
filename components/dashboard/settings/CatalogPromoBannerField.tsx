"use client";

import { Plus, Trash2 } from "lucide-react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import {
  MAX_PROMO_BANNER_SLIDES,
  createPromoBannerSlideId,
  defaultPromoBannerSettings,
  resolvePromoBannerSettings,
} from "@/lib/store-settings/promo-banner";
import type {
  CatalogPromoBannerSettings,
  CatalogPromoBannerSlide,
} from "@/lib/store-settings/types";

interface CatalogPromoBannerFieldProps {
  value?: CatalogPromoBannerSettings;
  disabled?: boolean;
  onChange: (next: CatalogPromoBannerSettings) => void;
}

export function CatalogPromoBannerField({
  value,
  disabled = false,
  onChange,
}: CatalogPromoBannerFieldProps) {
  const promoBanner = resolvePromoBannerSettings(value ?? defaultPromoBannerSettings());
  const canAddSlide = promoBanner.slides.length < MAX_PROMO_BANNER_SLIDES;

  function update(next: CatalogPromoBannerSettings) {
    onChange(resolvePromoBannerSettings(next));
  }

  function setEnabled(enabled: boolean) {
    update({ ...promoBanner, enabled });
  }

  function updateSlide(
    slideId: string,
    patch: Partial<CatalogPromoBannerSlide>,
  ) {
    update({
      ...promoBanner,
      slides: promoBanner.slides.map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide,
      ),
    });
  }

  function removeSlide(slideId: string) {
    update({
      ...promoBanner,
      slides: promoBanner.slides.filter((slide) => slide.id !== slideId),
    });
  }

  function addSlide() {
    if (!canAddSlide) return;

    update({
      ...promoBanner,
      slides: [
        ...promoBanner.slides,
        {
          id: createPromoBannerSlideId(),
          mobileImageUrl: "",
        },
      ],
    });
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
          disabled={disabled}
        />
      </div>

      {promoBanner.enabled ? (
        <div className="design-promo-banner-slides">
          <p className="px-2 text-xs leading-relaxed text-zinc-500">
            Sube al menos una imagen para móvil. Opcionalmente añade otra para
            escritorio (recomendado 1600×400 px).
          </p>

          {promoBanner.slides.length === 0 ? (
            <p className="px-2 text-xs text-zinc-500">
              Aún no hay imágenes en el carrusel.
            </p>
          ) : null}

          {promoBanner.slides.map((slide, index) => (
            <section key={slide.id} className="design-promo-banner-slide">
              <div className="design-promo-banner-slide-header">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Imagen {index + 1}
                </p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSlide(slide.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60 dark:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Eliminar
                </button>
              </div>

              <CatalogBannerImageUpload
                id={`promo-banner-mobile-${slide.id}`}
                label="Móvil"
                hint="Recomendado 800×320 px. Se recorta sin deformarse."
                value={slide.mobileImageUrl}
                required
                disabled={disabled}
                onChange={(mobileImageUrl) =>
                  updateSlide(slide.id, { mobileImageUrl })
                }
              />

              <CatalogBannerImageUpload
                id={`promo-banner-desktop-${slide.id}`}
                label="Escritorio"
                hint="Si no subes una, se usa la imagen móvil."
                value={slide.desktopImageUrl ?? ""}
                disabled={disabled}
                onChange={(desktopImageUrl) =>
                  updateSlide(slide.id, {
                    desktopImageUrl: desktopImageUrl || undefined,
                  })
                }
              />

              <div className="design-promo-banner-slide-fields">
                <div>
                  <label
                    htmlFor={`promo-banner-alt-${slide.id}`}
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Texto alternativo
                  </label>
                  <input
                    id={`promo-banner-alt-${slide.id}`}
                    type="text"
                    value={slide.alt ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updateSlide(slide.id, {
                        alt: event.target.value || undefined,
                      })
                    }
                    className="input-field mt-1 py-2 text-sm"
                    placeholder={`Promoción ${index + 1}`}
                    maxLength={120}
                  />
                </div>

                <div>
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
                    disabled={disabled}
                    onChange={(event) =>
                      updateSlide(slide.id, {
                        linkUrl: event.target.value || undefined,
                      })
                    }
                    className="input-field mt-1 py-2 text-sm"
                    placeholder="https://… o /categorias"
                  />
                </div>
              </div>
            </section>
          ))}

          <button
            type="button"
            disabled={disabled || !canAddSlide}
            onClick={addSlide}
            className="design-promo-banner-add inline-flex items-center gap-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Añadir imagen al carrusel
          </button>
        </div>
      ) : null}
    </div>
  );
}
