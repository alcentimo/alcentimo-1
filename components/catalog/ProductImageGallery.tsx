"use client";

import { useMemo, useState } from "react";
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
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
}

export function ProductImageGallery({
  product,
  className,
  imageClassName,
  fallbackClassName,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  loading = "lazy",
}: ProductImageGalleryProps) {
  const images = useMemo(
    () => resolveCatalogProductImages(product),
    [product.gallery_images, product.thumb_url],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage: CatalogProductGalleryImage | null =
    images[activeIndex] ?? images[0] ?? null;
  const alt = product.image_alt ?? product.product_name;

  if (!activeImage) {
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className={cn(fallbackClassName, className)}
      />
    );
  }

  return (
    <div className={cn("product-image-gallery", className)}>
      <CatalogProductImage
        src={activeImage.thumb_url}
        alt={alt}
        className={imageClassName}
        loading={loading}
        sizes={sizes}
      />

      {images.length > 1 ? (
        <>
          <span className="product-image-gallery-count" aria-hidden="true">
            {activeIndex + 1}/{images.length}
          </span>
          <div
            className="product-image-gallery-thumbs"
            role="tablist"
            aria-label="Fotos del producto"
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
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "product-image-gallery-thumb",
                    selected && "product-image-gallery-thumb-active",
                  )}
                >
                  <CatalogProductImage
                    src={image.thumb_url}
                    alt=""
                    className="product-image-gallery-thumb-image"
                    loading="lazy"
                    sizes="48px"
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
