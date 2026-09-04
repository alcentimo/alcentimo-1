"use client";

import { useCallback, useRef, type UIEvent } from "react";

/** Distancia de scroll (px) en la que la barra pasa de transparente a opaca. */
export const PRODUCT_HEADER_FADE_PX = 112;

export function headerFadeProgress(scrollY: number): number {
  if (scrollY <= 0) return 0;
  if (scrollY >= PRODUCT_HEADER_FADE_PX) return 1;
  return scrollY / PRODUCT_HEADER_FADE_PX;
}

/**
 * Vincula el scroll de la ficha a `--product-header-progress` sin re-render.
 * En Y=0 la barra queda en opacity 0; a ~112px llega a 1.
 */
export function useProductHeaderFade() {
  const headerRef = useRef<HTMLElement | null>(null);
  const tickingRef = useRef(false);
  const lastYRef = useRef(0);

  const apply = useCallback((y: number) => {
    const header = headerRef.current;
    if (!header) return;
    const progress = headerFadeProgress(y);
    header.style.setProperty("--product-header-progress", progress.toFixed(4));
    header.toggleAttribute("data-at-top", progress <= 0.02);
  }, []);

  const reset = useCallback(() => {
    lastYRef.current = 0;
    apply(0);
  }, [apply]);

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      lastYRef.current = event.currentTarget.scrollTop;
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        tickingRef.current = false;
        apply(lastYRef.current);
      });
    },
    [apply],
  );

  return { headerRef, onScroll, reset };
}
