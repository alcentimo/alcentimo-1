export const PENDING_CONFIRMATION_RESENT_MESSAGE =
  "Ya registramos una cuenta con este correo pero aún falta verificarla. Te hemos enviado un nuevo enlace de activación.";

export const EXISTING_CONFIRMED_ACCOUNT_MESSAGE =
  "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";

export type AuthEmailActionResult =
  | { ok: true; resentPendingConfirmation?: boolean; notice?: string }
  | { ok: false; error: string };

/** Normaliza la respuesta de la Server Action (incluye formas parciales tras serialización). */
export function parseAuthEmailActionResult(raw: unknown): AuthEmailActionResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "No se pudo completar el registro." };
  }

  const result = raw as Record<string, unknown>;
  const notice =
    typeof result.notice === "string" && result.notice.trim()
      ? result.notice.trim()
      : undefined;
  const resentPendingConfirmation = Boolean(result.resentPendingConfirmation);
  const okValue = result.ok;

  if (okValue === true || okValue === "true") {
    return {
      ok: true,
      resentPendingConfirmation,
      notice,
    };
  }

  // Aviso de reenvío aunque falte ok:true (defensivo).
  if (notice || resentPendingConfirmation) {
    return {
      ok: true,
      resentPendingConfirmation: true,
      notice: notice ?? PENDING_CONFIRMATION_RESENT_MESSAGE,
    };
  }

  const error =
    typeof result.error === "string" && result.error.trim()
      ? result.error.trim()
      : "No se pudo completar el registro.";

  return { ok: false, error };
}

export function isPendingActivationNotice(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("aún falta verificar") ||
    lower.includes("nuevo enlace de activación") ||
    lower.includes("te hemos enviado un nuevo enlace")
  );
}

/** Cuenta ya confirmada (no confundir con activación pendiente). */
export function isExistingConfirmedAccountError(message: string): boolean {
  if (isPendingActivationNotice(message)) return false;

  const lower = message.toLowerCase().trim();
  return (
    lower.includes("ya existe una cuenta") ||
    lower.includes("inicia sesión o recupera") ||
    lower.includes("intentar iniciar sesión") ||
    (lower.includes("already") &&
      (lower.includes("registered") ||
        lower.includes("exists") ||
        lower.includes("been registered"))) ||
    lower.includes("user already exists") ||
    lower.includes("email address is already") ||
    lower.includes("email_exists")
  );
}
