"use client";

import { useMemo } from "react";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import {
  resolveCatalogProductImages,
  urlsToCatalogGalleryImages,
  type CatalogProductGalleryImage,
} from "@/lib/products/product-gallery-types";
import { cn } from "@/lib/cn";

export interface MercadoProductGalleryProps {
  productName: string;
  /** URLs planas (p. ej. galería mayorista). */
  imageUrls?: string[];
  /** Filas ya resueltas (`product_images` / detalle). */
  images?: CatalogProductGalleryImage[];
  product?: {
    product_slug?: string | null;
    thumb_url?: string | null;
    gallery_images?: unknown;
    image_alt?: string | null;
    category_slug?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  mode?: "card" | "detail";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  /** En tarjetas: abrir ficha al tocar la foto (no las flechas). */
  onMediaClick?: () => void;
}

export function MercadoProductGallery({
  productName,
  imageUrls,
  images: imagesOverride,
  product,
  mode = "detail",
  className,
  imageClassName,
  fallbackClassName,
  sizes,
  loading,
  onMediaClick,
}: MercadoProductGalleryProps) {
  const resolvedImages = useMemo(() => {
    if (imagesOverride && imagesOverride.length > 0) return imagesOverride;
    if (product) {
      const fromProduct = resolveCatalogProductImages(product);
      if (fromProduct.length > 0) return fromProduct;
    }
    if (imageUrls && imageUrls.length > 0) {
      return urlsToCatalogGalleryImages(imageUrls);
    }
    return [];
  }, [imagesOverride, product, imageUrls]);

  const galleryProduct = useMemo(
    () => ({
      product_name: productName,
      product_slug: product?.product_slug ?? null,
      image_alt: product?.image_alt ?? null,
      thumb_url: product?.thumb_url ?? resolvedImages[0]?.thumb_url ?? null,
      gallery_images: resolvedImages,
      category_slug: product?.category_slug ?? null,
      metadata: product?.metadata ?? null,
    }),
    [
      productName,
      product?.image_alt,
      product?.thumb_url,
      product?.product_slug,
      product?.category_slug,
      product?.metadata,
      resolvedImages,
    ],
  );

  if (mode === "detail") {
    return (
      <section className={cn("mercado-mp-detail-gallery", className)}>
        <ProductImageGallery
          product={galleryProduct}
          images={resolvedImages.length > 0 ? resolvedImages : undefined}
          mode="detail"
          className="product-detail-gallery !rounded-none !border-0 !bg-transparent !shadow-none"
          imageClassName={
            imageClassName ?? "product-detail-gallery-image"
          }
          fallbackClassName={
            fallbackClassName ??
            "product-detail-gallery-fallback mercado-card-media-fallback text-4xl"
          }
          sizes={sizes ?? "(max-width: 1023px) 100vw, 450px"}
          loading={loading ?? "eager"}
        />
      </section>
    );
  }

  return (
    <ProductImageGallery
      product={galleryProduct}
      images={resolvedImages.length > 0 ? resolvedImages : undefined}
      mode="card"
      className={className}
      imageClassName={
        imageClassName ?? "object-contain object-center"
      }
      fallbackClassName={fallbackClassName ?? "mercado-card-media-fallback"}
      sizes={
        sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
      }
      loading={loading ?? "lazy"}
      onMediaClick={onMediaClick}
    />
  );
}
