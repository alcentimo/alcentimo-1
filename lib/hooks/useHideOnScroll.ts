"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

interface UseHideOnScrollOptions {
  /** Distancia mínima desde el tope para permitir ocultar. */
  topOffset?: number;
  /** Delta de scroll para cambiar de estado (evita jitter). */
  delta?: number;
  /** Contenedor con overflow; por defecto el viewport. */
  targetRef?: RefObject<HTMLElement | null>;
}

/**
 * Oculta la barra al hacer scroll hacia abajo y la muestra al subir.
 * No modifica el flujo del documento (solo clase visual).
 */
export function useHideOnScroll(
  enabled = true,
  { topOffset = 16, delta = 6, targetRef }: UseHideOnScrollOptions = {},
): boolean {
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled) {
      hiddenRef.current = false;
      setHidden(false);
      return;
    }

    const target = targetRef?.current ?? null;
    const readY = () =>
      target ? target.scrollTop : window.scrollY;

    let lastY = readY();
    let ticking = false;

    function apply(nextHidden: boolean) {
      if (nextHidden === hiddenRef.current) return;
      hiddenRef.current = nextHidden;
      setHidden(nextHidden);
    }

    function update() {
      ticking = false;
      const y = readY();
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

    const node: HTMLElement | Window = target ?? window;
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [delta, enabled, targetRef, topOffset]);

  return hidden;
}
