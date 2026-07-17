import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";

/**
 * Valida peticiones del cron de Vercel.
 * Vercel envía Authorization: Bearer <CRON_SECRET> cuando CRON_SECRET está configurado.
 * También envía x-vercel-cron: 1 en invocaciones programadas.
 */
export function verifyCronRequest(request: Request): {
  authorized: boolean;
  reason?: string;
  source?: "vercel-cron" | "bearer-secret";
} {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (!cronSecret) {
    return {
      authorized: false,
      reason: "CRON_SECRET no está configurado en Vercel → Environment Variables.",
    };
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) {
    logBcvSync(
      "cron_auth_failed",
      {
        reason: "missing_authorization",
        isVercelCron,
        path: new URL(request.url).pathname,
      },
      "warn",
    );

    return {
      authorized: false,
      reason:
        "Falta Authorization. En Vercel configura CRON_SECRET; el cron lo envía como Bearer.",
    };
  }

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = (bearerMatch?.[1] ?? authHeader).trim();

  if (token === cronSecret) {
    return {
      authorized: true,
      source: isVercelCron ? "vercel-cron" : "bearer-secret",
    };
  }

  logBcvSync(
    "cron_auth_failed",
    {
      reason: "token_mismatch",
      isVercelCron,
      path: new URL(request.url).pathname,
    },
    "warn",
  );

  return {
    authorized: false,
    reason: "El token no coincide con CRON_SECRET.",
  };
}
