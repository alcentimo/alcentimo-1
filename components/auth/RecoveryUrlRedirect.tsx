"use client";

import { useEffect } from "react";

/**
 * Si Supabase redirige a / con tokens en query o hash, envía al usuario
 * a la página de restablecimiento preservando parámetros (el hash no viaja al servidor).
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

    if (hasQueryAuth || hasHashAuth) {
      window.location.replace(
        `/dashboard/restablecer-contrasena${search}${hash}`,
      );
    }
  }, []);

  return null;
}
