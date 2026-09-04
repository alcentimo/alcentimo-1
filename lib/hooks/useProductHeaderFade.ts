"use client";

import { useEffect, useRef } from "react";

/** Distancia de scroll (px) en la que la barra pasa de transparente a opaca. */
export const PRODUCT_HEADER_FADE_PX = 120;

function supportsScrollTimeline(): boolean {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timeline: scroll()")
  );
}

/**
 * Fallback cuando el navegador no anima `--product-header-progress` con scroll-timeline.
 * Solo escribe una custom property (sin re-render).
 */
export function useProductHeaderFade(
  headerRef: { current: HTMLElement | null },
  scrollRef: { current: HTMLElement | null },
  resetKey: string,
) {
  const tickingRef = useRef(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const header = headerRef.current;
    const scroll = scrollRef.current;
    if (!header || !scroll) return;
    if (supportsScrollTimeline()) return;

    const apply = (y: number) => {
      const progress =
        y <= 0 ? 0 : y >= PRODUCT_HEADER_FADE_PX ? 1 : y / PRODUCT_HEADER_FADE_PX;
      header.style.setProperty("--product-header-progress", progress.toFixed(4));
    };

    apply(0);

    const onScroll = () => {
      lastYRef.current = scroll.scrollTop;
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        apply(lastYRef.current);
      });
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroll.removeEventListener("scroll", onScroll);
    };
  }, [headerRef, scrollRef, resetKey]);
}
