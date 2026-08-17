"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

interface MercadoProductGalleryProps {
  productName: string;
  imageUrls: string[];
}

export function MercadoProductGallery({
  productName,
  imageUrls,
}: MercadoProductGalleryProps) {
  const urls = useMemo(
    () => [...new Set(imageUrls.map((url) => url.trim()).filter(Boolean))],
    [imageUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = urls[activeIndex] ?? urls[0] ?? null;

  return (
    <section className="mercado-mp-detail-gallery">
      <div className="mercado-mp-detail-hero">
        {activeUrl ? (
          <Image
            src={activeUrl}
            alt={productName}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 560px"
            unoptimized
            priority
          />
        ) : (
          <div
            className="mercado-card-media-fallback text-4xl"
            aria-hidden="true"
          >
            {productName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {urls.length > 0 ? (
        <div className="mercado-mp-detail-thumbs" role="list">
          {urls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              role="listitem"
              className={cn(
                "mercado-mp-detail-thumb p-0",
                index === activeIndex && "mercado-mp-detail-thumb-active",
              )}
              onClick={() => setActiveIndex(index)}
              aria-label={`Foto ${index + 1} de ${urls.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="72px"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
