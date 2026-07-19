function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  return (bearerMatch?.[1] ?? authHeader).trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getProjectRefFromSupabaseUrl(): string | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const ref = hostname.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Acepta service role JWT emitido por Supabase aunque no coincida byte-a-byte
 * con SUPABASE_SERVICE_ROLE_KEY del entorno (p. ej. tras rotación de keys).
 */
export function verifyServiceRoleJwt(request: Request): boolean {
  const token =
    extractBearerToken(request) ?? request.headers.get("apikey")?.trim() ?? null;
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const projectRef = getProjectRefFromSupabaseUrl();
  if (!projectRef) return false;

  return payload.ref === projectRef && payload.role === "service_role";
}

export function authorizeProvisionRequest(request: Request): {
  authorized: boolean;
  source?: "cron-secret" | "service-role-env" | "service-role-jwt" | "apikey";
  reason?: string;
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
      source: bearerToken === serviceRoleKey ? "service-role-env" : "cron-secret",
    };
  }

  if (apiKey && acceptedTokens.includes(apiKey)) {
    return { authorized: true, source: "apikey" };
  }

  if (verifyServiceRoleJwt(request)) {
    return { authorized: true, source: "service-role-jwt" };
  }

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
        "Falta Authorization o apikey. Envía Bearer <service_role JWT> o CRON_SECRET.",
    };
  }

  return {
    authorized: false,
    reason:
      "El token no es un service role JWT válido del proyecto ni coincide con CRON_SECRET.",
  };
}
