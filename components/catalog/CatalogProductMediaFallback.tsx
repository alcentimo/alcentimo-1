import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface CatalogProductMediaFallbackProps {
  alt?: string;
  className?: string;
  showLabel?: boolean;
}

/** Placeholder minimalista para productos sin imagen en el catálogo. */
export function CatalogProductMediaFallback({
  alt,
  className,
  showLabel = true,
}: CatalogProductMediaFallbackProps) {
  return (
    <div
      className={cn("catalog-product-media-fallback", className)}
      role={alt ? "img" : undefined}
      aria-label={alt ? `Sin imagen: ${alt}` : undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className="catalog-product-media-fallback-icon-wrap" aria-hidden="true">
        <ImageOff className="catalog-product-media-fallback-icon" />
      </span>
      {showLabel ? (
        <span className="catalog-product-media-fallback-text">Sin imagen</span>
      ) : null}
    </div>
  );
}
