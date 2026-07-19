#!/usr/bin/env node
/**
 * Resuelve y guarda CLOUDFLARE_ZONE_ID en Supabase secrets.
 * Requiere CLOUDFLARE_API_TOKEN en .env.local o variable de entorno.
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PROJECT_REF = "pboxqwrogkwxkrjvbsqo";
const APEX_HOST = "alcentimo.com";

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

const token =
  loadEnvLocal().CLOUDFLARE_API_TOKEN?.trim() ||
  process.env.CLOUDFLARE_API_TOKEN?.trim();

if (!token) {
  console.error(
    "[zone] Añade CLOUDFLARE_API_TOKEN a .env.local (Cloudflare → My Profile → API Tokens).",
  );
  process.exit(1);
}

const url = new URL("https://api.cloudflare.com/client/v4/zones");
url.searchParams.set("name", APEX_HOST);

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});

const json = await response.json();
if (!response.ok || !json.success || !json.result?.[0]?.id) {
  console.error("[zone] No se pudo resolver la zona:", JSON.stringify(json.errors ?? json));
  process.exit(1);
}

const zoneId = json.result[0].id;
console.log("[zone] alcentimo.com →", zoneId);

const result = spawnSync(
  "npx",
  [
    "supabase",
    "secrets",
    "set",
    `CLOUDFLARE_ZONE_ID=${zoneId}`,
    "--project-ref",
    PROJECT_REF,
  ],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
