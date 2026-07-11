"use client";

import { useEffect } from "react";

/**
 * Si Supabase redirige a / con tokens en query o hash, envía al handler correcto.
 * Query (?code=, ?token_hash=) → /auth/confirm (servidor + cookies).
 * Hash (#access_token=) → restablecer-contrasena (solo cliente).
 */
export function RecoveryUrlRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (pathname !== "/") return;

    const searchParams = new URLSearchParams(search);
    const hasQueryAuth =
      searchParams.has("code") ||
      searchParams.has("token_hash") ||
      searchParams.get("type") === "recovery";

    const hasHashAuth =
      hash.includes("access_token") ||
      hash.includes("type=recovery") ||
      hash.includes("refresh_token");

    if (hasQueryAuth) {
      const params = new URLSearchParams(search);
      if (!params.has("next")) {
        params.set("next", "/dashboard/restablecer-contrasena");
      }
      window.location.replace(`/auth/confirm?${params.toString()}`);
      return;
    }

    if (hasHashAuth) {
      window.location.replace(
        `/dashboard/restablecer-contrasena${search}${hash}`,
      );
    }
  }, []);

  return null;
}
