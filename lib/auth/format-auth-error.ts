/**
 * Traduce mensajes / códigos de error de Supabase Auth (y callbacks) al español.
 * Nunca devuelve vacío: ante mensajes raros o en inglés muestra un texto usable.
 */
export function formatAuthError(message: string | null | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) {
    return "No se pudo completar la autenticación. Intenta de nuevo.";
  }

  const lower = raw.toLowerCase();

  // Códigos estables de /auth/callback y flujos internos
  if (
    lower === "auth_callback_missing_code" ||
    lower.includes("auth_callback_missing_code")
  ) {
    return "El enlace de acceso es incompleto. Solicita uno nuevo o inicia sesión de nuevo.";
  }

  if (
    lower === "auth_callback_exchange_failed" ||
    lower.includes("auth_callback_exchange_failed")
  ) {
    return "No se pudo completar el acceso desde el enlace. Intenta iniciar sesión otra vez.";
  }

  if (
    lower === "auth_session_verify_failed" ||
    lower.includes("no se pudo verificar la sesión")
  ) {
    return "La sesión no se pudo verificar. Cierra otras pestañas e intenta iniciar sesión de nuevo.";
  }

  if (lower === "invalid_store" || lower.includes("invalid_store")) {
    return "La tienda del enlace no es válida. Abre el catálogo desde el enlace correcto.";
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower === "invalid email or password"
  ) {
    return "Correo o contraseña incorrectos.";
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email address not confirmed")
  ) {
    return "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  }

  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered")
  ) {
    return "Ya existe una cuenta con este correo. Intenta iniciar sesión.";
  }

  if (
    lower.includes("code verifier") ||
    lower.includes("pkce") ||
    (lower.includes("code") && lower.includes("verifier"))
  ) {
    return "Abre el enlace en el mismo navegador donde iniciaste el proceso, o solicita uno nuevo.";
  }

  if (
    lower.includes("expired") ||
    lower.includes("expirado") ||
    (lower.includes("invalid") &&
      (lower.includes("token") ||
        lower.includes("session") ||
        lower.includes("otp") ||
        lower.includes("refresh")))
  ) {
    return "El enlace o la sesión ha expirado. Solicita uno nuevo o inicia sesión otra vez.";
  }

  if (
    lower.includes("refresh_token") ||
    lower.includes("session_not_found") ||
    lower.includes("auth session missing")
  ) {
    return "Tu sesión expiró o no está disponible en este dispositivo. Inicia sesión de nuevo.";
  }

  if (lower.includes("same password") || lower.includes("misma contraseña")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }

  if (lower.includes("weak") || lower.includes("débil")) {
    return "La contraseña es demasiado débil. Usa al menos 8 caracteres.";
  }

  if (
    lower.includes("password should be at least") ||
    lower.includes("password is too short")
  ) {
    return "La contraseña es demasiado corta. Usa al menos 6 caracteres.";
  }

  if (
    lower.includes("unable to validate email") ||
    lower.includes("invalid email") ||
    lower.includes("email address") && lower.includes("invalid")
  ) {
    return "El correo electrónico no es válido.";
  }

  if (lower.includes("signup is disabled")) {
    return "El registro está deshabilitado temporalmente. Intenta más tarde.";
  }

  if (lower.includes("nonce") && lower.includes("mismatch")) {
    return "Error de verificación con Google. Intenta de nuevo o contacta soporte.";
  }

  if (lower.includes("unexpected response was received from the server")) {
    return "Error al procesar la sesión con Google. Intenta de nuevo.";
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_request_rate_limit")
  ) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("fetch failed") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("abort")
  ) {
    return "Problema de conexión. Revisa tu internet e intenta de nuevo.";
  }

  // Mensajes ya en español legibles
  if (/[áéíóúñ¿¡]/i.test(raw) || raw.includes("No se pudo")) {
    return raw;
  }

  // Evitar mostrar códigos técnicos crudos al usuario
  if (/^[a-z0-9_:-]+$/i.test(raw) && raw.length < 64) {
    return "No se pudo completar la autenticación. Intenta de nuevo.";
  }

  return raw;
}
