import type { SupabaseClient } from "@supabase/supabase-js";

export type RecoveryUrlDebug = {
  href: string;
  pathname: string;
  search: string;
  hashLength: number;
  code: string | null;
  codeLength: number;
  tokenHash: string | null;
  tokenHashLength: number;
  type: string | null;
  hashType: string | null;
  hasHashAccessToken: boolean;
  hasHashRefreshToken: boolean;
  errorParam: string | null;
  maskedCode: string | null;
  maskedTokenHash: string | null;
};

function maskToken(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return `[${value.length} chars]`;
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

function parseHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

/** Información de depuración sobre lo que llega en la URL (sin exponer tokens completos). */
export function getRecoveryUrlDebug(): RecoveryUrlDebug {
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const hashParams = parseHashParams();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");

  return {
    href: typeof window !== "undefined" ? window.location.href : "",
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    search: typeof window !== "undefined" ? window.location.search : "",
    hashLength: typeof window !== "undefined" ? window.location.hash.length : 0,
    code,
    codeLength: code?.length ?? 0,
    tokenHash,
    tokenHashLength: tokenHash?.length ?? 0,
    type: searchParams.get("type"),
    hashType: hashParams.get("type"),
    hasHashAccessToken: hashParams.has("access_token"),
    hasHashRefreshToken: hashParams.has("refresh_token"),
    errorParam:
      searchParams.get("error_description") ?? searchParams.get("error"),
    maskedCode: maskToken(code),
    maskedTokenHash: maskToken(tokenHash),
  };
}

function cleanRecoveryUrl(): void {
  window.history.replaceState({}, "", "/dashboard/restablecer-contrasena");
}

export type EstablishRecoveryResult =
  | { ok: true; method: string }
  | { ok: false; error: string; method: string };

/**
 * Establece sesión de recuperación desde query (?code=, ?token_hash=) o hash (#access_token=).
 * Debe ejecutarse en el cliente: el hash nunca llega al servidor.
 */
export async function establishRecoverySession(
  supabase: SupabaseClient,
): Promise<EstablishRecoveryResult> {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = parseHashParams();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? hashParams.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { ok: false, error: error.message, method: "exchangeCodeForSession" };
    }
    cleanRecoveryUrl();
    return { ok: true, method: "exchangeCodeForSession" };
  }

  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return { ok: false, error: error.message, method: "verifyOtp" };
    }
    cleanRecoveryUrl();
    return { ok: true, method: "verifyOtp" };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      return { ok: false, error: error.message, method: "setSession(hash)" };
    }
    cleanRecoveryUrl();
    return { ok: true, method: "setSession(hash)" };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (session && !sessionError) {
    return { ok: true, method: "existing-getSession" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (user && !userError) {
    return { ok: true, method: "existing-getUser" };
  }

  return {
    ok: false,
    error: "No se encontraron credenciales de recuperación en la URL.",
    method: "none",
  };
}
