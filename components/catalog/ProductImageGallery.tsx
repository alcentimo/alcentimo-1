"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
}: ProductImageGalleryProps) {
  const images = useMemo(() => {
    if (imagesOverride && imagesOverride.length > 0) {
      return imagesOverride;
    }
    return resolveCatalogProductImages(product);
  }, [imagesOverride, product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeImage: CatalogProductGalleryImage | null =
    images[activeIndex] ?? images[0] ?? null;
  const alt = product.image_alt ?? product.product_name;
  const isDetail = mode === "detail";
  const hasMultiple = images.length > 1;

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
        className,
      )}
      onTouchStart={isDetail ? handleTouchStart : undefined}
      onTouchEnd={isDetail ? handleTouchEnd : undefined}
    >
      <CatalogProductImage
        src={galleryDisplayUrl(activeImage, mode)}
        alt={alt}
        className={imageClassName}
        loading={loading}
        sizes={sizes}
      />

      {hasMultiple ? (
        <>
          <span className="product-image-gallery-count" aria-hidden="true">
            {activeIndex + 1}/{images.length}
          </span>

          {isDetail ? (
            <>
              <button
                type="button"
                onClick={(event) => {
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

          <div
            className={cn(
              "product-image-gallery-thumbs",
              isDetail && "product-image-gallery-thumbs-detail",
            )}
            role="tablist"
            aria-label="Miniaturas del producto"
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
                    isDetail && "product-image-gallery-thumb-lg",
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
        </>
      ) : null}
    </div>
  );
}
