"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BRAND_PWA_ICON_192_PATH } from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface AuthBootSplashProps {
  children: ReactNode;
}

/**
 * Splash inicial del login: logo con pulso suave y fade-out
 * antes de revelar el formulario (evita el salto tosco PWA → UI).
 */
export function AuthBootSplash({ children }: AuthBootSplashProps) {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      setPhase("done");
      return;
    }

    const fadeTimer = window.setTimeout(() => setPhase("out"), 480);
    const doneTimer = window.setTimeout(() => setPhase("done"), 860);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className="relative min-h-dvh">
      {children}
      {phase !== "done" ? (
        <div
          className={cn(
            "auth-boot-splash",
            phase === "out" && "auth-boot-splash--out",
          )}
          role="status"
          aria-live="polite"
          aria-label="Cargando"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_PWA_ICON_192_PATH}
            width={80}
            height={80}
            alt=""
            className="auth-boot-splash-logo"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Fallback de Suspense alineado al splash PWA (fondo oscuro + logo). */
export function AuthBootSplashFallback() {
  return (
    <div className="auth-boot-splash" role="status" aria-label="Cargando">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_PWA_ICON_192_PATH}
        width={80}
        height={80}
        alt=""
        className="auth-boot-splash-logo"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
