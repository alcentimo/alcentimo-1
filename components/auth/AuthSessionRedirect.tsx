"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { DashboardPostAuthLoading } from "@/components/dashboard/DashboardPostAuthLoading";

/**
 * Si ya hay sesión (p. ej. arranque PWA), redirige al panel sin bloquear
 * el render del formulario de login.
 */
export function AuthSessionRedirect() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

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
        const destination = resolvePostAuthPath(next);
        setRedirecting(true);
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

  if (redirecting) {
    return <DashboardPostAuthLoading message="Restaurando tu sesión…" />;
  }

  return null;
}
