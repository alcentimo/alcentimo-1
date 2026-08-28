"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { CatalogProductImage } from "@/components/catalog/CatalogProductImage";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import {
  resolveCatalogProductImages,
  type CatalogProductGalleryImage,
} from "@/lib/products/product-gallery-types";
import { cn } from "@/lib/cn";

interface ProductImageGalleryProps {
  product: {
    product_name: string;
    image_alt?: string | null;
    thumb_url?: string | null;
    gallery_images?: unknown;
  };
  images?: CatalogProductGalleryImage[];
  mode?: "card" | "detail";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  /** Click en la foto (no en flechas/puntos) para abrir ficha o navegar. */
  onMediaClick?: () => void;
}

function galleryDisplayUrl(
  image: CatalogProductGalleryImage,
  mode: "card" | "detail",
): string {
  if (mode === "detail") {
    return image.full_url ?? image.medium_url ?? image.thumb_url;
  }
  return image.thumb_url;
}

export function ProductImageGallery({
  product,
  images: imagesOverride,
  mode = "card",
  className,
  imageClassName,
  fallbackClassName,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  loading = "lazy",
  onMediaClick,
}: ProductImageGalleryProps) {
  const images = useMemo(() => {
    if (imagesOverride && imagesOverride.length > 0) {
      return imagesOverride;
    }
    return resolveCatalogProductImages(product);
  }, [imagesOverride, product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMounted, setLightboxMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const activeImage: CatalogProductGalleryImage | null =
    images[activeIndex] ?? images[0] ?? null;
  const alt = product.image_alt ?? product.product_name;
  const isDetail = mode === "detail";
  const hasMultiple = images.length > 1;
  const showThumbs = isDetail && hasMultiple;

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      const wrapped =
        ((index % images.length) + images.length) % images.length;
      setActiveIndex(wrapped);
    },
    [images.length],
  );

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const canEnlarge = isDetail && !onMediaClick;

  useEffect(() => {
    setActiveIndex(0);
  }, [product.product_name, images.length, images[0]?.id]);

  useEffect(() => {
    setLightboxMounted(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLightboxOpen(false);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [lightboxOpen, goPrev, goNext]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null || !hasMultiple) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  if (!activeImage) {
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className={cn(fallbackClassName, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "product-image-gallery",
        isDetail && "product-image-gallery-detail",
        !isDetail && "product-image-gallery-card",
        hasMultiple && "product-image-gallery-multi",
        className,
      )}
      onTouchStart={hasMultiple ? handleTouchStart : undefined}
      onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
    >
      <div
        className={cn(
          "product-image-gallery-stage",
          (onMediaClick || canEnlarge) && "cursor-pointer",
          canEnlarge && "product-image-gallery-stage-zoomable",
        )}
        onClick={
          onMediaClick || canEnlarge
            ? (event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                if (onMediaClick) {
                  onMediaClick();
                  return;
                }
                setLightboxOpen(true);
              }
            : undefined
        }
      >
        <CatalogProductImage
          src={galleryDisplayUrl(activeImage, mode)}
          alt={alt}
          className={imageClassName}
          loading={loading}
          sizes={sizes}
        />

        {canEnlarge ? (
          <button
            type="button"
            className="product-image-gallery-zoom"
            aria-label="Ampliar foto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setLightboxOpen(true);
            }}
          >
            <Expand className="h-4 w-4" />
          </button>
        ) : null}

        {hasMultiple ? (
          <>
            <span className="product-image-gallery-count" aria-hidden="true">
              {activeIndex + 1}/{images.length}
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goPrev();
              }}
              className="product-image-gallery-nav product-image-gallery-nav-prev"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goNext();
              }}
              className="product-image-gallery-nav product-image-gallery-nav-next"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div
              className="product-image-gallery-dots"
              role="tablist"
              aria-label="Fotos del producto"
            >
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Ver foto ${index + 1}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    goTo(index);
                  }}
                  className={cn(
                    "product-image-gallery-dot",
                    index === activeIndex && "product-image-gallery-dot-active",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {showThumbs ? (
        <div
          className={cn(
            "product-image-gallery-thumbs",
            "product-image-gallery-thumbs-detail",
          )}
          role="tablist"
          aria-label="Miniaturas del producto"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {images.map((image, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Ver foto ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(index);
                }}
                className={cn(
                  "product-image-gallery-thumb",
                  selected && "product-image-gallery-thumb-active",
                  "product-image-gallery-thumb-lg",
                )}
              >
                <CatalogProductImage
                  src={image.thumb_url}
                  alt=""
                  className="product-image-gallery-thumb-image"
                  loading="lazy"
                  sizes="64px"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxMounted && lightboxOpen && activeImage
        ? createPortal(
            <div className="product-gallery-lightbox" role="dialog" aria-modal="true">
              <button
                type="button"
                className="product-gallery-lightbox-backdrop"
                aria-label="Cerrar vista ampliada"
                onClick={() => setLightboxOpen(false)}
              />
              <div className="product-gallery-lightbox-frame">
                <button
                  type="button"
                  className="product-gallery-lightbox-close"
                  aria-label="Cerrar"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="product-gallery-lightbox-stage">
                  <CatalogProductImage
                    src={galleryDisplayUrl(activeImage, "detail")}
                    alt={alt}
                    className="product-gallery-lightbox-image"
                    loading="eager"
                    sizes="100vw"
                  />
                  {hasMultiple ? (
                    <>
                      <button
                        type="button"
                        className="product-image-gallery-nav product-image-gallery-nav-prev"
                        aria-label="Foto anterior"
                        onClick={goPrev}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        className="product-image-gallery-nav product-image-gallery-nav-next"
                        aria-label="Foto siguiente"
                        onClick={goNext}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  ) : null}
                </div>
                {hasMultiple ? (
                  <div
                    className="product-gallery-lightbox-thumbs"
                    role="tablist"
                    aria-label="Miniaturas del producto"
                  >
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Ver foto ${index + 1}`}
                        onClick={() => goTo(index)}
                        className={cn(
                          "product-image-gallery-thumb product-image-gallery-thumb-lg",
                          index === activeIndex &&
                            "product-image-gallery-thumb-active",
                        )}
                      >
                        <CatalogProductImage
                          src={image.thumb_url}
                          alt=""
                          className="product-image-gallery-thumb-image"
                          loading="lazy"
                          sizes="72px"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
