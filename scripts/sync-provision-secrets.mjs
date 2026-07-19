#!/usr/bin/env node
/**
 * Sincroniza secrets de aprovisionamiento en Supabase desde .env.local.
 * No imprime valores sensibles.
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT_REF = "pboxqwrogkwxkrjvbsqo";
const APEX_HOST = "alcentimo.com";
const VERCEL_PROJECT_ID = "prj_sZqpSdqpwbaYcRyhbfHgRgfMvn9M";

function loadEnvLocal() {
  const env = {};
  if (!existsSync(".env.local")) return env;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) env[key] = value;
  }

  return env;
}

async function resolveCloudflareZoneId(apiToken) {
  const url = new URL("https://api.cloudflare.com/client/v4/zones");
  url.searchParams.set("name", APEX_HOST);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.result?.[0]?.id) {
    const message =
      json.errors?.map((entry) => entry.message).join("; ") ??
      `Cloudflare zones lookup failed (${response.status})`;
    throw new Error(message);
  }

  return json.result[0].id;
}

const localEnv = loadEnvLocal();
const serviceRoleKey = localEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!serviceRoleKey) {
  console.warn(
    "[sync] SUPABASE_SERVICE_ROLE_KEY no encontrada en .env.local — la Edge Function valida JWT; continúo con otros secrets.",
  );
}

const secrets = {
  STORE_SUBDOMAIN_PROVISION_ENABLED: "true",
  SITE_URL: localEnv.NEXT_PUBLIC_SITE_URL?.trim() || "https://alcentimo.com",
  STORE_SUBDOMAIN_APEX_HOST: APEX_HOST,
  VERCEL_PROJECT_ID:
    localEnv.VERCEL_PROJECT_ID?.trim() || VERCEL_PROJECT_ID,
};

const cloudflareToken =
  localEnv.CLOUDFLARE_API_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

if (localEnv.CLOUDFLARE_ZONE_ID?.trim()) {
  secrets.CLOUDFLARE_ZONE_ID = localEnv.CLOUDFLARE_ZONE_ID.trim();
  console.log("[sync] CLOUDFLARE_ZONE_ID: usando valor de .env.local");
} else if (cloudflareToken) {
  try {
    secrets.CLOUDFLARE_ZONE_ID = await resolveCloudflareZoneId(cloudflareToken);
    console.log("[sync] CLOUDFLARE_ZONE_ID: resuelto via API de Cloudflare");
  } catch (error) {
    console.warn(
      "[sync] No se pudo resolver CLOUDFLARE_ZONE_ID:",
      error instanceof Error ? error.message : String(error),
    );
  }
} else {
  console.warn(
    "[sync] CLOUDFLARE_ZONE_ID omitido — añade CLOUDFLARE_API_TOKEN a .env.local temporalmente o CLOUDFLARE_ZONE_ID manualmente.",
  );
}

const tempPath = join(tmpdir(), `supabase-secrets-${Date.now()}.env`);
const tempContents = Object.entries(secrets)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

writeFileSync(tempPath, tempContents, { encoding: "utf8", mode: 0o600 });

console.log("[sync] Actualizando secrets en Supabase...");
console.log("[sync] Keys:", Object.keys(secrets).join(", "));

const result = spawnSync(
  "npx",
  ["supabase", "secrets", "set", "--env-file", tempPath, "--project-ref", PROJECT_REF],
  { stdio: "inherit", shell: true },
);

try {
  unlinkSync(tempPath);
} catch {
  // ignore
}

if ((result.status ?? 1) !== 0) {
  console.error("[sync] Falló supabase secrets set.");
  process.exit(result.status ?? 1);
}

console.log("[sync] Secrets actualizados en Supabase.");
console.log("[sync] Siguiente paso: node scripts/smoke-test-provision-store-subdomain.mjs");
