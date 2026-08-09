"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Package, Plus, Search, X } from "lucide-react";
import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/cn";

interface CatalogPromoBannerFieldProps {
  value?: CatalogPromoBannerSettings;
  onChange: (next: CatalogPromoBannerSettings, shouldSave?: boolean) => void;
  products?: CouponProductOption[];
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
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  const [productPickerSlideId, setProductPickerSlideId] = useState<string | null>(
    null,
  );
  const [productSearch, setProductSearch] = useState("");

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

  /** Galería / cámara: nueva imagen sin enlace a producto. */
  function handleManualImageChange(slideId: string, mobileImageUrl: string) {
    updateSlide(
      slideId,
      {
        mobileImageUrl,
        productId: undefined,
        linkUrl: undefined,
      },
      true,
    );
  }

  function openInventoryImagePicker(slideId: string) {
    setProductSearch("");
    window.setTimeout(() => {
      setProductPickerSlideId(slideId);
    }, 0);
  }

  function applyProductImageAndLink(
    slideId: string,
    product: CouponProductOption,
  ) {
    if (!product.thumbUrl) return;

    updateSlide(
      slideId,
      {
        mobileImageUrl: product.thumbUrl,
        productId: product.id,
        linkUrl: undefined,
      },
      true,
    );
    setProductPickerSlideId(null);
    setProductSearch("");
  }

  function clearProductLink(slideId: string) {
    updateSlide(slideId, { productId: undefined, linkUrl: undefined }, true);
  }

  function removeSlide(slideId: string) {
    if (productPickerSlideId === slideId) {
      setProductPickerSlideId(null);
      setProductSearch("");
    }

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

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return sortedProducts;
    return sortedProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.categoryName?.toLowerCase().includes(query) ?? false),
    );
  }, [productSearch, sortedProducts]);

  const pickerSlide = productPickerSlideId
    ? promoBanner.slides.find((slide) => slide.id === productPickerSlideId)
    : null;

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
            Usa “Cambiar imagen” para cargar una foto (sin enlace) o “Usar
            imagen de un producto” para vincular el clic. “Eliminar” quita esa
            imagen del carrusel.
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
                  const linkedProduct = sortedProducts.find(
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
                            handleManualImageChange(slide.id, mobileImageUrl)
                          }
                          onPickFromInventory={() =>
                            openInventoryImagePicker(slide.id)
                          }
                          inventoryOptionLabel="Usar imagen de un producto"
                          onRemoveSlide={() => removeSlide(slide.id)}
                          removeSlideLabel={`Eliminar imagen ${index + 1}`}
                        />

                        {linkedProduct ? (
                          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 px-2.5 py-2 dark:border-teal-900/50 dark:bg-teal-950/30">
                            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                              {linkedProduct.thumbUrl ? (
                                <Image
                                  src={linkedProduct.thumbUrl}
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="m-auto h-3.5 w-3.5 text-zinc-400" />
                              )}
                            </div>
                            <p className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                              Clic abre{" "}
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                {linkedProduct.name}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => clearProductLink(slide.id)}
                              className="rounded-md p-1 text-zinc-400 hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-900"
                              aria-label="Quitar vínculo con el producto"
                              title="Quitar vínculo (conserva la imagen)"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
                      </div>
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

      <Dialog
        open={Boolean(productPickerSlideId)}
        onOpenChange={(open) => {
          if (!open) {
            setProductPickerSlideId(null);
            setProductSearch("");
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onClose={() => {
            setProductPickerSlideId(null);
            setProductSearch("");
          }}
        >
          <DialogHeader>
            <DialogTitle>Usar imagen de un producto</DialogTitle>
            <DialogDescription>
              El banner usará su foto y el clic abrirá ese producto en el
              catálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Buscar por nombre o categoría…"
              className="input-field pl-10"
              autoFocus
            />
          </div>

          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {sortedProducts.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No hay productos publicados. Agrégalos en Catálogo primero.
              </li>
            ) : filteredProducts.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-zinc-500">
                No hay productos que coincidan.
              </li>
            ) : (
              filteredProducts.map((product) => {
                const selected = pickerSlide?.productId === product.id;
                const missingThumb = !product.thumbUrl;

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={missingThumb}
                      onClick={() => {
                        if (!productPickerSlideId || missingThumb) return;
                        applyProductImageAndLink(
                          productPickerSlideId,
                          product,
                        );
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        selected
                          ? "border-teal-300 bg-teal-50/80 dark:border-teal-800 dark:bg-teal-950/40"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
                        missingThumb && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        {product.thumbUrl ? (
                          <Image
                            src={product.thumbUrl}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <Package className="m-auto h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {missingThumb
                            ? "Sin foto — no se puede usar como banner"
                            : product.categoryName || "Sin categoría"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <DialogFooter className="mt-4">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => {
                setProductPickerSlideId(null);
                setProductSearch("");
              }}
            >
              Cancelar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
