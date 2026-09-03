"use client";

import { useEffect, useState } from "react";

interface UseHideOnScrollOptions {
  /** Distancia mínima desde el tope para permitir ocultar. */
  topOffset?: number;
  /** Delta de scroll para cambiar de estado (evita jitter). */
  delta?: number;
}

export interface BindHideOnScrollOptions {
  topOffset?: number;
  delta?: number;
  getY: () => number;
  onHiddenChange: (hidden: boolean) => void;
  addListener: (handler: () => void) => () => void;
}

/** Enlaza scroll → clase oculta sin setState (60fps). */
export function bindHideOnScroll({
  topOffset = 24,
  delta = 8,
  getY,
  onHiddenChange,
  addListener,
}: BindHideOnScrollOptions): () => void {
  let lastY = getY();
  let ticking = false;
  let currentHidden = false;

  function apply(nextHidden: boolean) {
    if (nextHidden === currentHidden) return;
    currentHidden = nextHidden;
    onHiddenChange(nextHidden);
  }

  function update() {
    ticking = false;
    const y = getY();
    const diff = y - lastY;

    if (y <= topOffset) {
      apply(false);
      lastY = y;
      return;
    }

    if (diff > delta) {
      apply(true);
      lastY = y;
      return;
    }

    if (diff < -delta) {
      apply(false);
      lastY = y;
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  return addListener(onScroll);
}

/**
 * Oculta la barra al hacer scroll hacia abajo y la muestra al subir,
 * con un umbral para que el gesto se sienta nativo.
 */
export function useHideOnScroll(
  enabled = true,
  { topOffset = 24, delta = 8 }: UseHideOnScrollOptions = {},
): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setHidden(false);
      return;
    }

    return bindHideOnScroll({
      topOffset,
      delta,
      getY: () => window.scrollY,
      onHiddenChange: setHidden,
      addListener: (handler) => {
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
      },
    });
  }, [delta, enabled, topOffset]);

  return hidden;
}
