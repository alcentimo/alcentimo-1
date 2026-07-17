/**
 * Variables de entorno en Vercel.
 * Usado por scripts/verify-vercel-env.mjs en cada despliegue.
 *
 * Solo VERCEL_CORE_ENV_VARS bloquean el build en producción.
 * Las integraciones (Meta, etc.) son opcionales.
 */
export const VERCEL_CORE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

/** Recomendadas en producción; el build continúa si faltan. */
export const VERCEL_SERVER_ENV_VARS = ["SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Integración Meta / WhatsApp — opcional. */
export const VERCEL_META_ENV_VARS = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
] as const;

export const VERCEL_OPTIONAL_ENV_VARS = [
  ...VERCEL_META_ENV_VARS,
  "API_SECRET_KEY",
  "ALLOW_DEV_AUTH_BYPASS",
  "NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION",
] as const;

export type VercelCoreEnvVar = (typeof VERCEL_CORE_ENV_VARS)[number];
export type VercelMetaEnvVar = (typeof VERCEL_META_ENV_VARS)[number];
