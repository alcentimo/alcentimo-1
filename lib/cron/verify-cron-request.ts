/**
 * Valida peticiones del cron de Vercel.
 * Vercel envía CRON_SECRET como: Authorization: Bearer <CRON_SECRET>
 * (variable de entorno del proyecto, no Deno/Supabase Edge).
 */
export function verifyCronRequest(request: Request): {
  authorized: boolean;
  reason?: string;
} {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return {
      authorized: false,
      reason: "CRON_SECRET no está configurado en el entorno de despliegue.",
    };
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) {
    return {
      authorized: false,
      reason:
        "Falta el encabezado Authorization. Vercel debe enviar Bearer <CRON_SECRET>.",
    };
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = (bearerMatch?.[1] ?? authHeader).trim();

  if (token === cronSecret) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason:
      "El token del encabezado Authorization no coincide con CRON_SECRET.",
  };
}
