"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import { cn } from "@/lib/cn";
import { isGifImageUrl } from "@/lib/media/is-gif-url";

interface CatalogProductImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  /** Miniatura ya vista en el grid; se muestra de inmediato mientras llega el recorte grande. */
  previewSrc?: string | null;
}

function markComplete(
  element: HTMLImageElement | null,
  onReady: () => void,
): void {
  if (element && element.complete && element.naturalWidth > 0) {
    onReady();
  }
}

export function CatalogProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw",
  priority = false,
  loading = "lazy",
  previewSrc = null,
}: CatalogProductImageProps) {
  const preview =
    previewSrc && previewSrc.trim() && previewSrc !== src
      ? previewSrc
      : null;
  const [failed, setFailed] = useState(false);
  const [hiResReady, setHiResReady] = useState(false);

  useEffect(() => {
    setFailed(false);
    setHiResReady(false);
  }, [src, preview]);

  if (failed && !preview) {
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className="catalog-product-image-fallback"
      />
    );
  }

  const showPreview = Boolean(preview) && !hiResReady;
  const showHiRes = !failed;

  return (
    <>
      {showPreview ? (
        <Image
          src={preview!}
          alt=""
          fill
          sizes={sizes}
          quality={72}
          unoptimized={isGifImageUrl(preview)}
          className={cn(
            "object-contain object-center catalog-product-image-el catalog-product-image-preview",
            className,
          )}
          aria-hidden
        />
      ) : null}
      {showHiRes ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={72}
          priority={priority}
          loading={priority ? undefined : loading}
          decoding="async"
          unoptimized={isGifImageUrl(src)}
          className={cn(
            "object-contain object-center catalog-product-image-el",
            showPreview && "catalog-product-image-hires-pending",
            className,
          )}
          onLoad={() => setHiResReady(true)}
          onError={() => setFailed(true)}
          ref={(element) => {
            markComplete(element, () => setHiResReady(true));
          }}
        />
      ) : null}
    </>
  );
}
