"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  getCatalogStoreInitials,
  useCatalogStoreBranding,
} from "@/components/catalog/CatalogStoreBrandingContext";
import { cn } from "@/lib/cn";

interface CatalogProductMediaFallbackProps {
  alt?: string;
  className?: string;
  /** Reservado para vistas de detalle; el grid no muestra etiqueta visible. */
  showLabel?: boolean;
}

/** Placeholder estilizado para productos sin imagen en el catálogo público. */
export function CatalogProductMediaFallback({
  alt,
  className,
  showLabel = false,
}: CatalogProductMediaFallbackProps) {
  const branding = useCatalogStoreBranding();
  const logoUrl = branding?.logoUrl ?? null;
  const storeName = branding?.storeName ?? "";
  const monogram = storeName ? getCatalogStoreInitials(storeName) : null;

  return (
    <div
      className={cn("catalog-product-media-fallback", className)}
      role={alt ? "img" : undefined}
      aria-label={alt ? `Imagen no disponible: ${alt}` : undefined}
      aria-hidden={alt ? undefined : true}
    >
      {logoUrl ? (
        <div className="catalog-product-media-fallback-logo" aria-hidden="true">
          <Image
            src={logoUrl}
            alt=""
            fill
            sizes="200px"
            className="catalog-product-media-fallback-logo-image"
          />
        </div>
      ) : monogram ? (
        <span
          className="catalog-product-media-fallback-monogram"
          aria-hidden="true"
        >
          {monogram}
        </span>
      ) : null}

      <div className="catalog-product-media-fallback-overlay" aria-hidden="true" />

      <span className="catalog-product-media-fallback-icon-wrap" aria-hidden="true">
        <ImageIcon className="catalog-product-media-fallback-icon" strokeWidth={1.5} />
      </span>

      {showLabel ? (
        <span className="catalog-product-media-fallback-text">Sin imagen</span>
      ) : null}
    </div>
  );
}
