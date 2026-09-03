"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export type StoreHeaderScrollMode = "hide-on-down" | "reveal-on-down";

interface UseHideOnScrollOptions {
  topOffset?: number;
  delta?: number;
  targetRef?: RefObject<HTMLElement | null>;
  /**
   * `hide-on-down`: clásico (baja → oculta).
   * `reveal-on-down`: ficha de producto (inicio oculta; baja → muestra; sube → oculta).
   */
  mode?: StoreHeaderScrollMode;
}

export function useHideOnScroll(
  enabled = true,
  {
    topOffset = 12,
    delta = 6,
    targetRef,
    mode = "hide-on-down",
  }: UseHideOnScrollOptions = {},
): boolean {
  const startHidden = mode === "reveal-on-down";
  const [hidden, setHidden] = useState(startHidden);
  const hiddenRef = useRef(startHidden);

  useLayoutEffect(() => {
    if (!enabled) {
      hiddenRef.current = false;
      setHidden(false);
      return;
    }

    const start = mode === "reveal-on-down";
    hiddenRef.current = start;
    setHidden(start);

    const target = targetRef?.current ?? null;
    const readY = () => (target ? target.scrollTop : window.scrollY);

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

      if (mode === "reveal-on-down") {
        if (y <= topOffset) {
          apply(true);
          lastY = y;
          return;
        }
        if (diff > delta) {
          apply(false);
          lastY = y;
          return;
        }
        if (diff < -delta) {
          apply(true);
          lastY = y;
        }
        return;
      }

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
  }, [delta, enabled, mode, targetRef, topOffset]);

  return hidden;
}
