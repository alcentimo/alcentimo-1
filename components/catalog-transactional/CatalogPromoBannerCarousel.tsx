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
import type { CatalogPromoBannerSettings } from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface CatalogPromoBannerCarouselProps {
  promoBanner?: CatalogPromoBannerSettings | null;
  storeName: string;
  className?: string;
}

const AUTO_ADVANCE_MS = 6500;
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
  const hasMultiple = slides.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      const wrapped =
        ((index % slides.length) + slides.length) % slides.length;
      setActiveIndex(wrapped);
    },
    [slides.length],
  );

  const goPrev = useCallback(() => {
    setActiveIndex((current) =>
      slides.length === 0
        ? current
        : ((current - 1 + slides.length) % slides.length),
    );
  }, [slides.length]);

  const goNext = useCallback(() => {
    setActiveIndex((current) =>
      slides.length === 0 ? current : (current + 1) % slides.length,
    );
  }, [slides.length]);

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
  }, [slides.length, settings.enabled]);

  useEffect(() => {
    if (!hasMultiple || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        slides.length === 0 ? current : (current + 1) % slides.length,
      );
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [hasMultiple, isPaused, slides.length]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  if (slides.length === 0) {
    return null;
  }

  const activeSlide = slides[activeIndex] ?? slides[0];
  const imageUrls = resolveSlideImageUrls(activeSlide);
  const alt =
    activeSlide.alt?.trim() ||
    `Promoción ${activeIndex + 1} de ${storeName}`;

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

  const slideContent = (
    <div className="txn-promo-banner-media">
      <Image
        src={imageUrls.desktop}
        alt={alt}
        fill
        priority={activeIndex === 0}
        loading={activeIndex === 0 ? "eager" : "lazy"}
        sizes="(max-width: 767px) 0px, 1152px"
        className="txn-promo-banner-image txn-promo-banner-image-desktop"
      />
      <Image
        src={imageUrls.mobile}
        alt={alt}
        fill
        priority={activeIndex === 0}
        loading={activeIndex === 0 ? "eager" : "lazy"}
        sizes="100vw"
        className="txn-promo-banner-image txn-promo-banner-image-mobile"
      />
    </div>
  );

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
        {activeSlide.linkUrl ? (
          activeSlide.linkUrl.startsWith("/") ? (
            <Link href={activeSlide.linkUrl} className="txn-promo-banner-link">
              {slideContent}
            </Link>
          ) : (
            <a
              href={activeSlide.linkUrl}
              className="txn-promo-banner-link"
              rel="noopener noreferrer"
              target="_blank"
            >
              {slideContent}
            </a>
          )
        ) : (
          slideContent
        )}

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
              aria-label="Promociones"
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Ver promoción ${index + 1}`}
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
