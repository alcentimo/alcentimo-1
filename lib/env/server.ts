/**
 * Acceso tipado a variables de entorno del servidor.
 * Nunca importar desde componentes cliente.
 */

import { requireSupabasePublicEnv } from "@/lib/supabase/config";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Variable de entorno requerida no configurada: ${name}. Añádela en Vercel → Settings → Environment Variables.`,
    );
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Valores inyectados por scripts/inject-vercel-env.mjs cuando falta config real. */
const ENV_PLACEHOLDER_VALUES = new Set(["pending-configuration", "changeme", "xxx"]);

export function isConfiguredEnvValue(
  value: string | undefined,
): value is string {
  return Boolean(value && !ENV_PLACEHOLDER_VALUES.has(value));
}

export function getPublicSiteUrl(fallbackOrigin?: string): string {
  return (
    optionalEnv("NEXT_PUBLIC_SITE_URL") ??
    fallbackOrigin ??
    "http://localhost:3000"
  );
}

export function getSupabasePublicConfig() {
  return requireSupabasePublicEnv();
}

export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

export function isVercelProduction(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

export function getApiSecretKey(): string | undefined {
  return optionalEnv("API_SECRET_KEY");
}

export function getOpenAiApiKey(): string | undefined {
  const key = optionalEnv("OPENAI_API_KEY");
  return isConfiguredEnvValue(key) ? key : undefined;
}
