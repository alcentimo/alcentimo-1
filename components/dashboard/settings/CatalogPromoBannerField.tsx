"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Package, Plus, Search, Trash2, X } from "lucide-react";
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

type BannerLinkMode = "none" | "product";
type ProductPickerIntent = "link" | "image-and-link";

interface CatalogPromoBannerFieldProps {
  value?: CatalogPromoBannerSettings;
  onChange: (next: CatalogPromoBannerSettings, shouldSave?: boolean) => void;
  products?: CouponProductOption[];
}

function resolveStoredLinkMode(slide: CatalogPromoBannerSlide): BannerLinkMode {
  return slide.productId ? "product" : "none";
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
    () =>
      [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  /** Modo de destino en UI (evita que “Producto” se resetee sin productId). */
  const [linkModeBySlide, setLinkModeBySlide] = useState<
    Record<string, BannerLinkMode>
  >({});
  const [productPicker, setProductPicker] = useState<{
    slideId: string;
    intent: ProductPickerIntent;
  } | null>(null);
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

  function getLinkMode(slide: CatalogPromoBannerSlide): BannerLinkMode {
    return linkModeBySlide[slide.id] ?? resolveStoredLinkMode(slide);
  }

  function openProductPicker(slideId: string, intent: ProductPickerIntent) {
    setProductSearch("");
    // Esperar a que el <select> nativo cierre el foco antes de abrir el modal.
    window.setTimeout(() => {
      setProductPicker({ slideId, intent });
    }, 0);
  }

  function setLinkMode(slideId: string, mode: BannerLinkMode) {
    setLinkModeBySlide((current) => ({ ...current, [slideId]: mode }));

    if (mode === "none") {
      updateSlide(slideId, { productId: undefined, linkUrl: undefined }, true);
      return;
    }

    // Mantener productId si ya había uno; abrir buscador para elegir/cambiar.
    updateSlide(slideId, { linkUrl: undefined }, false);
    openProductPicker(slideId, "link");
  }

  function openInventoryImagePicker(slideId: string) {
    setLinkModeBySlide((current) => ({ ...current, [slideId]: "product" }));
    openProductPicker(slideId, "image-and-link");
  }

  function applyProduct(
    slideId: string,
    product: CouponProductOption,
    intent: ProductPickerIntent,
  ) {
    setLinkModeBySlide((current) => ({ ...current, [slideId]: "product" }));
    updateSlide(
      slideId,
      {
        productId: product.id,
        linkUrl: undefined,
        ...(intent === "image-and-link" && product.thumbUrl
          ? { mobileImageUrl: product.thumbUrl }
          : {}),
      },
      true,
    );
    setProductPicker(null);
    setProductSearch("");
  }

  function clearProduct(slideId: string) {
    setLinkModeBySlide((current) => ({ ...current, [slideId]: "none" }));
    updateSlide(slideId, { productId: undefined, linkUrl: undefined }, true);
  }

  function removeSlide(slideId: string) {
    setLinkModeBySlide((current) => {
      const next = { ...current };
      delete next[slideId];
      return next;
    });
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

  const pickerSlide = productPicker
    ? promoBanner.slides.find((slide) => slide.id === productPicker.slideId)
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
            La imagen se elige con “Cambiar imagen”. El destino define a qué
            producto redirige el clic en el catálogo.
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
                  const linkMode = getLinkMode(slide);
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
                          onPickFromInventory={() =>
                            openInventoryImagePicker(slide.id)
                          }
                          inventoryOptionLabel="Usar imagen de un producto"
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
                            onChange={(event) => {
                              const nextMode = event.target
                                .value as BannerLinkMode;
                              event.currentTarget.blur();
                              setLinkMode(slide.id, nextMode);
                            }}
                            className="input-field mt-1 py-2 text-sm"
                          >
                            <option value="none">Sin enlace</option>
                            <option value="product">
                              Vincular con un producto
                            </option>
                          </select>

                          {linkMode === "product" ? (
                            <div className="space-y-2">
                              {selectedProduct ? (
                                <div className="flex items-center gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 px-2.5 py-2 dark:border-teal-900/50 dark:bg-teal-950/30">
                                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                    {selectedProduct.thumbUrl ? (
                                      <Image
                                        src={selectedProduct.thumbUrl}
                                        alt=""
                                        fill
                                        sizes="40px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <Package className="m-auto h-4 w-4 text-zinc-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                      {selectedProduct.name}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                      El clic del banner abre este producto
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => clearProduct(slide.id)}
                                    className="rounded-md p-1.5 text-zinc-400 hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-900"
                                    aria-label="Quitar producto vinculado"
                                  >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-zinc-500">
                                  Elige a qué producto redirige el clic del
                                  banner.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  openProductPicker(slide.id, "link")
                                }
                                className="btn-brand-outline inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-xs"
                              >
                                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                                {selectedProduct
                                  ? "Cambiar producto vinculado"
                                  : "Buscar producto…"}
                              </button>
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

      <Dialog
        open={Boolean(productPicker)}
        onOpenChange={(open) => {
          if (!open) {
            setProductPicker(null);
            setProductSearch("");
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onClose={() => {
            setProductPicker(null);
            setProductSearch("");
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {productPicker?.intent === "image-and-link"
                ? "Usar imagen de un producto"
                : "Vincular con un producto"}
            </DialogTitle>
            <DialogDescription>
              {productPicker?.intent === "image-and-link"
                ? "Elige un producto para usar su foto en el banner y vincular el clic."
                : "Elige el producto al que redirigirá el clic del banner."}
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
                const missingThumb =
                  productPicker?.intent === "image-and-link" && !product.thumbUrl;

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={missingThumb}
                      onClick={() => {
                        if (!productPicker) return;
                        applyProduct(
                          productPicker.slideId,
                          product,
                          productPicker.intent,
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
                setProductPicker(null);
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
