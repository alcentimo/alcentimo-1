"use client";

import { useState } from "react";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import { cn } from "@/lib/cn";

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

function CatalogProductImageInner({
  src,
  alt,
  className,
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

  if (failed && !preview) {
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className="catalog-product-image-fallback"
      />
    );
  }

  const eager = priority || loading === "eager";
  const nativeLoading: "lazy" | "eager" = eager ? "eager" : "lazy";
  const showPreview = Boolean(preview) && !hiResReady;
  const showHiRes = !failed;

  return (
    <>
      {showPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview!}
          alt=""
          loading="eager"
          decoding="async"
          className={cn(
            "catalog-product-image-el catalog-product-image-preview",
            className,
          )}
          aria-hidden
        />
      ) : null}
      {showHiRes ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={nativeLoading}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={cn(
            "catalog-product-image-el",
            showPreview && "catalog-product-image-hires-pending",
            className,
          )}
          onLoad={() => setHiResReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </>
  );
}

export function CatalogProductImage(props: CatalogProductImageProps) {
  return (
    <CatalogProductImageInner
      key={`${props.src}|${props.previewSrc ?? ""}`}
      {...props}
    />
  );
}
