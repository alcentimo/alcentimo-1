"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";

/**
 * Tras pintar el shell de login (arranque PWA), si ya hay sesión
 * navega al panel en el cliente — sin redirect abrupto del middleware.
 */
export function AuthSessionRedirect() {
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fromPwa = searchParams.get("utm_source") === "pwa";
    if (!fromPwa) return;

    let cancelled = false;

    async function redirectIfAuthenticated() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const next = searchParams.get("next");
        const destination =
          next && next.startsWith("/") && !next.startsWith("//")
            ? resolvePostAuthPath(next)
            : "/dashboard";

        window.location.assign(destination);
      } catch {
        // Sin sesión usable: se queda en el formulario de login.
      }
    }

    // Esperar un frame para que el splash/shell ya estén en pantalla.
    const frame = window.requestAnimationFrame(() => {
      void redirectIfAuthenticated();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [searchParams]);

  return null;
}
