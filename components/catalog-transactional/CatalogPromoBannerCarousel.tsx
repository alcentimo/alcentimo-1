"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BANNER_DISPLAY_HEIGHT_DESKTOP_PX,
  BANNER_DISPLAY_HEIGHT_MOBILE_PX,
} from "@/lib/banner-image";
import {
  buildPromoBannerProductHref,
  getActivePromoBannerSlides,
  resolvePromoBannerSettings,
} from "@/lib/store-settings/promo-banner";
import type {
  CatalogPromoBannerSettings,
  CatalogPromoBannerSlide,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface CatalogPromoBannerCarouselProps {
  promoBanner?: CatalogPromoBannerSettings | null;
  storeName: string;
  storeSlug?: string;
  /** Abre la ficha del producto sin navegar (preferido en el catálogo). */
  onOpenProduct?: (productId: string) => void;
  className?: string;
}

const AUTO_ADVANCE_MS = 6000;

function resolveSlideImageUrls(slide: {
  mobileImageUrl: string;
  desktopImageUrl?: string;
}) {
  return {
    mobile: slide.mobileImageUrl,
    desktop: slide.desktopImageUrl?.trim() || slide.mobileImageUrl,
  };
}

function PromoBannerSlideMedia({
  slide,
  alt,
  isActive,
  isFirst,
}: {
  slide: CatalogPromoBannerSlide;
  alt: string;
  isActive: boolean;
  isFirst: boolean;
}) {
  const imageUrls = resolveSlideImageUrls(slide);

  return (
    <div className="txn-promo-banner-media">
      <Image
        src={imageUrls.desktop}
        alt={alt}
        fill
        priority={isFirst && isActive}
        loading={isFirst && isActive ? "eager" : "lazy"}
        sizes="(max-width: 767px) 0px, 1152px"
        className="txn-promo-banner-image txn-promo-banner-image-desktop"
      />
      <Image
        src={imageUrls.mobile}
        alt={alt}
        fill
        priority={isFirst && isActive}
        loading={isFirst && isActive ? "eager" : "lazy"}
        sizes="100vw"
        className="txn-promo-banner-image txn-promo-banner-image-mobile"
      />
    </div>
  );
}

export function CatalogPromoBannerCarousel({
  promoBanner,
  storeName,
  storeSlug,
  onOpenProduct,
  className,
}: CatalogPromoBannerCarouselProps) {
  const settings = resolvePromoBannerSettings(promoBanner ?? undefined, storeSlug);
  const slides = getActivePromoBannerSlides(settings);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [autoAdvanceEpoch, setAutoAdvanceEpoch] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const slideCount = slides.length;
  const hasMultiple = slideCount > 1;

  const clearAutoAdvance = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restartAutoAdvance = useCallback(() => {
    setAutoAdvanceEpoch((epoch) => epoch + 1);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount === 0) return;
      const wrapped = ((index % slideCount) + slideCount) % slideCount;
      setActiveIndex(wrapped);
    },
    [slideCount],
  );

  const goPrev = useCallback(() => {
    setActiveIndex((current) =>
      slideCount === 0
        ? current
        : ((current - 1 + slideCount) % slideCount),
    );
  }, [slideCount]);

  const goNext = useCallback(() => {
    setActiveIndex((current) =>
      slideCount === 0 ? current : (current + 1) % slideCount,
    );
  }, [slideCount]);

  const handleManualNavigation = useCallback(
    (navigate: () => void) => {
      navigate();
      restartAutoAdvance();
    },
    [restartAutoAdvance],
  );

  useEffect(() => {
    setActiveIndex(0);
    restartAutoAdvance();
  }, [slideCount, settings.enabled, restartAutoAdvance]);

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  useEffect(() => {
    clearAutoAdvance();

    if (slideCount < 2 || isHovered) {
      return clearAutoAdvance;
    }

    intervalRef.current = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTO_ADVANCE_MS);

    return clearAutoAdvance;
  }, [autoAdvanceEpoch, clearAutoAdvance, isHovered, slideCount]);

  useEffect(() => clearAutoAdvance, [clearAutoAdvance]);

  if (slideCount === 0) {
    return null;
  }

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null || !hasMultiple) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;

    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < 44) return;

    if (delta > 0) handleManualNavigation(goPrev);
    else handleManualNavigation(goNext);
  }

  return (
    <section
      className={cn("txn-promo-banner", className)}
      style={{
        ["--txn-promo-banner-height-mobile" as string]: `${BANNER_DISPLAY_HEIGHT_MOBILE_PX}px`,
        ["--txn-promo-banner-height-desktop" as string]: `${BANNER_DISPLAY_HEIGHT_DESKTOP_PX}px`,
      }}
      aria-label="Promociones destacadas"
      aria-roledescription="carrusel"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="txn-promo-banner-viewport">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const alt =
            slide.alt?.trim() ||
            `Promoción ${index + 1} de ${storeName}`;
          const slideInner = (
            <PromoBannerSlideMedia
              slide={slide}
              alt={alt}
              isActive={isActive}
              isFirst={index === 0}
            />
          );

          const productId = slide.productId?.trim();
          const productHref =
            productId && storeSlug
              ? buildPromoBannerProductHref(storeSlug, productId)
              : productId
                ? `/?product=${encodeURIComponent(productId)}`
                : null;
          const linkUrl = slide.linkUrl?.trim() || null;

          let slideContent = slideInner;

          if (productId && onOpenProduct) {
            slideContent = (
              <button
                type="button"
                className="txn-promo-banner-link"
                tabIndex={isActive ? 0 : -1}
                aria-label={alt}
                onClick={() => onOpenProduct(productId)}
              >
                {slideInner}
              </button>
            );
          } else if (productHref) {
            slideContent = (
              <Link
                href={productHref}
                className="txn-promo-banner-link"
                tabIndex={isActive ? 0 : -1}
              >
                {slideInner}
              </Link>
            );
          } else if (linkUrl) {
            slideContent = linkUrl.startsWith("/") ? (
              <Link
                href={linkUrl}
                className="txn-promo-banner-link"
                tabIndex={isActive ? 0 : -1}
              >
                {slideInner}
              </Link>
            ) : (
              <a
                href={linkUrl}
                className="txn-promo-banner-link"
                rel="noopener noreferrer"
                target="_blank"
                tabIndex={isActive ? 0 : -1}
              >
                {slideInner}
              </a>
            );
          }

          return (
            <div
              key={slide.id}
              className={cn(
                "txn-promo-banner-slide",
                isActive && "txn-promo-banner-slide-active",
              )}
              aria-hidden={!isActive}
            >
              {slideContent}
            </div>
          );
        })}

        {hasMultiple ? (
          <>
            <button
              type="button"
              className="txn-promo-banner-nav txn-promo-banner-nav-prev"
              aria-label="Promoción anterior"
              onClick={() => handleManualNavigation(goPrev)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="txn-promo-banner-nav txn-promo-banner-nav-next"
              aria-label="Promoción siguiente"
              onClick={() => handleManualNavigation(goNext)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <div
              className="txn-promo-banner-dots"
              role="tablist"
              aria-label={`${slideCount} promociones`}
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Ver promoción ${index + 1} de ${slideCount}`}
                  className={cn(
                    "txn-promo-banner-dot",
                    index === activeIndex && "txn-promo-banner-dot-active",
                  )}
                  onClick={() =>
                    handleManualNavigation(() => goTo(index))
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
