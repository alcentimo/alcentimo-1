"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import { cn } from "@/lib/cn";

interface CatalogProductImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

export function CatalogProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw",
  priority = false,
  loading = "lazy",
}: CatalogProductImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
  }, [src]);

  if (status === "error") {
    return (
      <CatalogProductMediaFallback
        alt={alt}
        className="catalog-product-image-fallback"
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "catalog-product-image-placeholder",
          status === "loaded" && "catalog-product-image-placeholder-done",
        )}
        aria-hidden="true"
      >
        <div className="catalog-product-image-shimmer" />
      </div>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={priority ? 82 : 72}
        priority={priority}
        loading={priority ? undefined : loading}
        decoding="async"
        draggable={false}
        className={cn(
          "object-contain object-center catalog-product-image-el",
          status === "loading" ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </>
  );
}
