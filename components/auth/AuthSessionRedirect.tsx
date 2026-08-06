"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/client";

/**
 * Si ya hay sesión (p. ej. arranque PWA), redirige al panel sin bloquear
 * el render del formulario de login.
 */
export function AuthSessionRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
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
        window.location.replace(destination);
      } catch {
        // Sin sesión usable: el formulario permanece visible.
      }
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return null;
}
