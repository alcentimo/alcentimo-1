function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  return (bearerMatch?.[1] ?? authHeader).trim();
}

function logAuthEvent(
  phase: string,
  data: Record<string, unknown>,
  level: "warn" | "error" = "warn",
): void {
  const line = `[bcv-sync] ${JSON.stringify({
    ts: new Date().toISOString(),
    phase,
    ...data,
  })}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  console.warn(line);
}

/**
 * Valida peticiones manuales (CRON_SECRET), programadas (apikey / service role)
 * y llamadas con Bearer service role.
 */
export function verifyCronRequest(request: Request): {
  authorized: boolean;
  reason?: string;
  source?: "cron-secret" | "service-role" | "apikey";
} {
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const bearerToken = extractBearerToken(request);
  const apiKey = request.headers.get("apikey")?.trim() ?? null;

  const acceptedTokens = [cronSecret, serviceRoleKey].filter(
    (value): value is string => Boolean(value),
  );

  if (bearerToken && acceptedTokens.includes(bearerToken)) {
    return {
      authorized: true,
      source: bearerToken === serviceRoleKey ? "service-role" : "cron-secret",
    };
  }

  if (apiKey && acceptedTokens.includes(apiKey)) {
    return { authorized: true, source: "apikey" };
  }

  logAuthEvent("edge_auth_failed", {
    hasAuthorization: Boolean(bearerToken),
    hasApiKey: Boolean(apiKey),
    headerNames: [...request.headers.keys()].filter((name) =>
      ["authorization", "apikey", "x-vercel-cron", "x-supabase-schedule"].includes(
        name.toLowerCase(),
      ),
    ),
  });

  if (!cronSecret && !serviceRoleKey) {
    return {
      authorized: false,
      reason:
        "CRON_SECRET o SUPABASE_SERVICE_ROLE_KEY no están configurados en los secrets de Supabase.",
    };
  }

  if (!bearerToken && !apiKey) {
    return {
      authorized: false,
      reason:
        "Falta Authorization o apikey. Envía Bearer <CRON_SECRET> o apikey con service role.",
    };
  }

  return {
    authorized: false,
    reason: "El token no coincide con CRON_SECRET o service role.",
  };
}
