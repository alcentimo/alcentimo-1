export type GoogleSessionApiResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/** Respuesta de POST /api/auth/google/session (JSON o error de red). */
export async function exchangeGoogleIdTokenForSession(input: {
  token: string;
  nonce: string;
  nextPath: string;
  storeSlug?: string;
  orderId?: string;
}): Promise<GoogleSessionApiResult> {
  let response: Response;

  try {
    response = await fetch("/api/auth/google/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        token: input.token,
        nonce: input.nonce,
        next: input.nextPath,
        store: input.storeSlug,
        orderId: input.orderId,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con el servidor. Revisa tu conexión.",
    };
  }

  let payload: unknown;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        error: "Respuesta inválida del servidor al iniciar sesión con Google.",
      };
    }
  } else {
    return {
      ok: false,
      error: response.ok
        ? "Respuesta inválida del servidor al iniciar sesión con Google."
        : `Error del servidor (${response.status}). Intenta de nuevo.`,
    };
  }

  if (!response.ok) {
    const error =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Error del servidor (${response.status}).`;
    return { ok: false, error };
  }

  if (
    payload &&
    typeof payload === "object" &&
    "redirectTo" in payload &&
    typeof (payload as { redirectTo: unknown }).redirectTo === "string"
  ) {
    return { ok: true, redirectTo: (payload as { redirectTo: string }).redirectTo };
  }

  return {
    ok: false,
    error: "Respuesta incompleta del servidor al iniciar sesión con Google.",
  };
}
