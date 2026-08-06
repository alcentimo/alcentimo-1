"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND_PWA_ICON_192_PATH } from "@/lib/brand/assets";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

interface AuthBootGateProps {
  children: ReactNode;
}

type GateState = "checking" | "guest" | "redirecting";

function AuthSplashShell({ fading = false }: { fading?: boolean }) {
  return (
    <div
      className={cn("auth-boot-splash", fading && "auth-boot-splash--out")}
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
  );
}

/**
 * Shell de arranque del login:
 * 1) Splash mientras verifica sesión (sin montar el formulario).
 * 2) Sesión activa → redirige al panel sin flash del login.
 * 3) Sin sesión → revela el formulario con fade suave.
 */
export function AuthBootGate({ children }: AuthBootGateProps) {
  const searchParams = useSearchParams();
  const [gate, setGate] = useState<GateState>("checking");
  const [splashPhase, setSplashPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          setGate("redirecting");
          const next = searchParams.get("next");
          const destination =
            next && next.startsWith("/") && !next.startsWith("//")
              ? resolvePostAuthPath(next)
              : "/dashboard";
          window.location.replace(destination);
          return;
        }
      } catch {
        // Continuar como invitado.
      }

      if (!cancelled) setGate("guest");
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (gate !== "guest") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setSplashPhase("done");
      return;
    }

    const fadeTimer = window.setTimeout(() => setSplashPhase("out"), 280);
    const doneTimer = window.setTimeout(() => setSplashPhase("done"), 620);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [gate]);

  if (gate === "checking" || gate === "redirecting") {
    return <AuthSplashShell />;
  }

  return (
    <div className="relative min-h-dvh">
      <div
        className={cn(
          "auth-boot-content",
          splashPhase === "in"
            ? "auth-boot-content--hidden"
            : "auth-boot-content--visible",
        )}
      >
        {children}
      </div>
      {splashPhase !== "done" ? (
        <AuthSplashShell fading={splashPhase === "out"} />
      ) : null}
    </div>
  );
}

/** Fallback de Suspense alineado al splash PWA (fondo oscuro + logo). */
export function AuthBootSplashFallback() {
  return <AuthSplashShell />;
}
