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
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw",
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
      {status === "loading" ? (
        <div className="catalog-product-image-placeholder" aria-hidden="true">
          <div className="catalog-product-image-shimmer" />
        </div>
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={80}
        priority={priority}
        loading={priority ? undefined : loading}
        className={cn(
          className,
          "object-cover object-center transition-opacity duration-300 ease-out",
          status === "loading" ? "opacity-0" : "opacity-100",
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </>
  );
}
