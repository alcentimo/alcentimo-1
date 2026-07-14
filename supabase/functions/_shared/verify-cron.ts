function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  return (bearerMatch?.[1] ?? authHeader).trim();
}

/**
 * Valida peticiones manuales (CRON_SECRET) y programadas de Supabase
 * (service role en Authorization).
 */
export function verifyCronRequest(request: Request): {
  authorized: boolean;
  reason?: string;
} {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const token = extractBearerToken(request);

  const acceptedTokens = [cronSecret, serviceRoleKey].filter(
    (value): value is string => Boolean(value),
  );

  if (token && acceptedTokens.includes(token)) {
    return { authorized: true };
  }

  if (!cronSecret) {
    return {
      authorized: false,
      reason: "CRON_SECRET no está configurado en los secrets de Supabase.",
    };
  }

  if (!token) {
    return {
      authorized: false,
      reason:
        "Falta el encabezado Authorization. Envía Bearer <CRON_SECRET>.",
    };
  }

  return {
    authorized: false,
    reason: "El token no coincide con CRON_SECRET o service role.",
  };
}
