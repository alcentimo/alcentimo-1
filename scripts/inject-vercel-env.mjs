/**
 * Inyecta variables de entorno en Vercel vía CLI (stdin).
 * Uso: node scripts/inject-vercel-env.mjs
 *
 * Valores sensibles pueden pasarse por entorno local antes de ejecutar:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/inject-vercel-env.mjs
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const ENVIRONMENTS = ["production", "preview"];

function readLocalEnv() {
  const env = {};
  if (!existsSync(".env.local")) return env;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
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

function addEnvVar(name, value) {
  for (const environment of ENVIRONMENTS) {
    const result = spawnSync(
      "npx",
      ["vercel", "env", "add", name, environment, "--force"],
      {
        input: value,
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    if (result.status !== 0) {
      const err = (result.stderr || result.stdout || "").trim();
      throw new Error(`No se pudo añadir ${name} (${environment}): ${err}`);
    }

    console.log(`[inject-vercel-env] OK ${name} → ${environment}`);
  }
}

const local = readLocalEnv();

const PLACEHOLDER = "pending-configuration";

const vars = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? local.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    local.NEXT_PUBLIC_SITE_URL ??
    "https://alcentimo.com",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    local.SUPABASE_SERVICE_ROLE_KEY ??
    PLACEHOLDER,
  META_APP_ID: process.env.META_APP_ID ?? local.META_APP_ID ?? PLACEHOLDER,
  META_APP_SECRET:
    process.env.META_APP_SECRET ?? local.META_APP_SECRET ?? PLACEHOLDER,
  META_WEBHOOK_VERIFY_TOKEN:
    process.env.META_WEBHOOK_VERIFY_TOKEN ??
    local.META_WEBHOOK_VERIFY_TOKEN ??
    randomBytes(32).toString("hex"),
  ML_APP_ID: process.env.ML_APP_ID ?? local.ML_APP_ID ?? PLACEHOLDER,
  ML_APP_SECRET: process.env.ML_APP_SECRET ?? local.ML_APP_SECRET ?? PLACEHOLDER,
  ML_SITE_TLD: process.env.ML_SITE_TLD ?? local.ML_SITE_TLD ?? "com.ve",
};

const required = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "META_WEBHOOK_VERIFY_TOKEN",
  "ML_SITE_TLD",
]);

for (const [name, value] of Object.entries(vars)) {
  if (!value?.trim()) {
    if (required.has(name)) {
      throw new Error(`Falta valor requerido para ${name}`);
    }
    continue;
  }

  addEnvVar(name, value.trim());
}

console.log("[inject-vercel-env] Variables inyectadas correctamente.");
