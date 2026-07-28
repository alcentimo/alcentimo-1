"use client";

import { Plus, Trash2 } from "lucide-react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
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

type BannerLinkMode = "none" | "product" | "custom";

interface CatalogPromoBannerFieldProps {
  value?: CatalogPromoBannerSettings;
  onChange: (next: CatalogPromoBannerSettings, shouldSave?: boolean) => void;
  products?: CouponProductOption[];
}

function resolveLinkMode(slide: CatalogPromoBannerSlide): BannerLinkMode {
  if (slide.productId) return "product";
  if (slide.linkUrl?.trim()) return "custom";
  return "none";
}

export function CatalogPromoBannerField({
  value,
  onChange,
  products = [],
}: CatalogPromoBannerFieldProps) {
  const promoBanner = normalizePromoBannerDraft(
    value ?? defaultPromoBannerSettings(),
  );
  const canAddSlide = promoBanner.slides.length < MAX_PROMO_BANNER_SLIDES;
  const sortedProducts = [...products].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

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

  function setLinkMode(slideId: string, mode: BannerLinkMode) {
    if (mode === "none") {
      updateSlide(slideId, { productId: undefined, linkUrl: undefined }, true);
      return;
    }
    if (mode === "product") {
      updateSlide(slideId, { linkUrl: undefined, productId: undefined }, false);
      return;
    }
    updateSlide(slideId, { productId: undefined }, false);
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
            Sube imágenes panorámicas para el carrusel. Puedes vincular cada
            imagen a un producto de tu inventario o a un enlace personalizado.
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
                {promoBanner.slides.map((slide, index) => {
                  const linkMode = resolveLinkMode(slide);
                  const selectedProduct = sortedProducts.find(
                    (product) => product.id === slide.productId,
                  );

                  return (
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

                        <div className="design-promo-banner-card-link space-y-2">
                          <label
                            htmlFor={`promo-banner-link-mode-${slide.id}`}
                            className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                          >
                            Destino al hacer clic
                          </label>
                          <select
                            id={`promo-banner-link-mode-${slide.id}`}
                            value={linkMode}
                            onChange={(event) =>
                              setLinkMode(
                                slide.id,
                                event.target.value as BannerLinkMode,
                              )
                            }
                            className="input-field mt-1 py-2 text-sm"
                          >
                            <option value="none">Sin enlace</option>
                            <option value="product">
                              Producto del inventario
                            </option>
                            <option value="custom">Enlace personalizado</option>
                          </select>

                          {linkMode === "product" ? (
                            <div>
                              <label
                                htmlFor={`promo-banner-product-${slide.id}`}
                                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                              >
                                Producto
                              </label>
                              <select
                                id={`promo-banner-product-${slide.id}`}
                                value={slide.productId ?? ""}
                                onChange={(event) =>
                                  updateSlide(
                                    slide.id,
                                    {
                                      productId: event.target.value || undefined,
                                      linkUrl: undefined,
                                    },
                                    true,
                                  )
                                }
                                className="input-field mt-1 py-2 text-sm"
                              >
                                <option value="">
                                  Selecciona un producto…
                                </option>
                                {sortedProducts.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                    {product.categoryName
                                      ? ` · ${product.categoryName}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              {sortedProducts.length === 0 ? (
                                <p className="mt-1 text-xs text-zinc-500">
                                  No hay productos publicados. Agrégalos en
                                  Catálogo primero.
                                </p>
                              ) : selectedProduct ? (
                                <p className="mt-1 text-xs text-zinc-500">
                                  Al hacer clic se abrirá la ficha de{" "}
                                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {selectedProduct.name}
                                  </span>
                                  .
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {linkMode === "custom" ? (
                            <div>
                              <label
                                htmlFor={`promo-banner-link-${slide.id}`}
                                className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                              >
                                Enlace
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
                                      productId: undefined,
                                    },
                                    true,
                                  )
                                }
                                className="input-field mt-1 py-2 text-sm"
                                placeholder="https://… o /categorias"
                              />
                            </div>
                          ) : null}
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
                  );
                })}
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
