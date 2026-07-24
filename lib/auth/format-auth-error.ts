/**
 * Traduce mensajes de error comunes de Supabase Auth al español.
 */
export function formatAuthError(message: string): string {
  const lower = message.toLowerCase().trim();

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
    lower.includes("expired") ||
    lower.includes("expirado") ||
    (lower.includes("invalid") &&
      (lower.includes("token") || lower.includes("session") || lower.includes("otp")))
  ) {
    return "El enlace ha expirado o ya no es válido. Solicita uno nuevo.";
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

  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "El correo electrónico no es válido.";
  }

  if (lower.includes("signup is disabled")) {
    return "El registro está deshabilitado temporalmente. Intenta más tarde.";
  }

  return message;
}
