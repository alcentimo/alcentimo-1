export const PENDING_CONFIRMATION_RESENT_MESSAGE =
  "Ya registramos una cuenta con este correo pero aún falta verificarla. Te hemos enviado un nuevo enlace de activación.";

export type AuthEmailActionResult =
  | { ok: true; resentPendingConfirmation?: boolean; notice?: string }
  | { ok: false; error: string };
