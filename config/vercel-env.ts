/**
 * Variables de entorno en Vercel.
 * Usado por scripts/verify-vercel-env.mjs en cada despliegue.
 *
 * Solo VERCEL_CORE_ENV_VARS bloquean el build en producción.
 */
export const VERCEL_CORE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

/** Recomendadas en producción; el build continúa si faltan. */
export const VERCEL_SERVER_ENV_VARS = ["SUPABASE_SERVICE_ROLE_KEY"] as const;

export const VERCEL_OPTIONAL_ENV_VARS = [
  "API_SECRET_KEY",
  "ALLOW_DEV_AUTH_BYPASS",
  "NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION",
  "CRON_SECRET",
] as const;

export type VercelCoreEnvVar = (typeof VERCEL_CORE_ENV_VARS)[number];
