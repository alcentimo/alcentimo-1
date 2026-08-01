/**
 * Logs seguros de autenticación (sin contraseñas ni tokens).
 * Visible en servidor (Vercel/logs) y en consola del navegador en client components.
 */
export function logAuthEvent(
  event: string,
  details?: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
): void {
  const payload = {
    scope: "auth",
    event,
    at: new Date().toISOString(),
    ...sanitizeAuthLogDetails(details),
  };

  if (level === "error") {
    console.error("[auth]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[auth]", payload);
    return;
  }
  console.info("[auth]", payload);
}

function sanitizeAuthLogDetails(
  details?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const blocked = new Set([
    "password",
    "token",
    "access_token",
    "refresh_token",
    "id_token",
    "authorization",
    "cookie",
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (blocked.has(key.toLowerCase())) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 240) {
      out[key] = `${value.slice(0, 240)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Extrae un mensaje de error usable desde unknown (fetch/AuthError/Error). */
export function getAuthCaughtMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error_description === "string") {
      return record.error_description;
    }
    if (typeof record.error === "string") return record.error;
  }
  return "";
}
