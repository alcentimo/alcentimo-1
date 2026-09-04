"use client";

import { useEffect, useState } from "react";

interface UseHideOnScrollOptions {
  /** Distancia mínima desde el tope para permitir ocultar. */
  topOffset?: number;
  /** Delta de scroll para cambiar de estado (evita jitter). */
  delta?: number;
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
    if (!enabled || typeof window === "undefined") return;

    let lastY = window.scrollY;
    let ticking = false;
    let currentHidden = false;

    function apply(nextHidden: boolean) {
      if (nextHidden === currentHidden) return;
      currentHidden = nextHidden;
      setHidden(nextHidden);
    }

    function update() {
      ticking = false;
      const y = window.scrollY;
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

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [delta, enabled, topOffset]);

  return hidden;
}
