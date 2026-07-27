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
  className?: string;
}

const AUTO_ADVANCE_MS = 6000;
const AUTO_RESUME_MS = 8000;

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
  className,
}: CatalogPromoBannerCarouselProps) {
  const settings = resolvePromoBannerSettings(promoBanner ?? undefined);
  const slides = getActivePromoBannerSlides(settings);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideCount = slides.length;
  const hasMultiple = slideCount > 1;

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

  const pauseAutoAdvance = useCallback(() => {
    setIsPaused(true);
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, AUTO_RESUME_MS);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [slideCount, settings.enabled]);

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  useEffect(() => {
    if (slideCount < 2 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, slideCount]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

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

    pauseAutoAdvance();
    if (delta > 0) goPrev();
    else goNext();
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
        }
        setIsPaused(false);
      }}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
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

          return (
            <div
              key={slide.id}
              className={cn(
                "txn-promo-banner-slide",
                isActive && "txn-promo-banner-slide-active",
              )}
              aria-hidden={!isActive}
            >
              {slide.linkUrl ? (
                slide.linkUrl.startsWith("/") ? (
                  <Link
                    href={slide.linkUrl}
                    className="txn-promo-banner-link"
                    tabIndex={isActive ? 0 : -1}
                  >
                    {slideInner}
                  </Link>
                ) : (
                  <a
                    href={slide.linkUrl}
                    className="txn-promo-banner-link"
                    rel="noopener noreferrer"
                    target="_blank"
                    tabIndex={isActive ? 0 : -1}
                  >
                    {slideInner}
                  </a>
                )
              ) : (
                slideInner
              )}
            </div>
          );
        })}

        {hasMultiple ? (
          <>
            <button
              type="button"
              className="txn-promo-banner-nav txn-promo-banner-nav-prev"
              aria-label="Promoción anterior"
              onClick={() => {
                pauseAutoAdvance();
                goPrev();
              }}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="txn-promo-banner-nav txn-promo-banner-nav-next"
              aria-label="Promoción siguiente"
              onClick={() => {
                pauseAutoAdvance();
                goNext();
              }}
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
                  onClick={() => {
                    pauseAutoAdvance();
                    goTo(index);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
