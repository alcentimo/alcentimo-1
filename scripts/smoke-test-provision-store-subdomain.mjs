#!/usr/bin/env node
/**
 * Smoke test: invoca provision-store-subdomain sin crear tienda en BD.
 * Uso: node scripts/smoke-test-provision-store-subdomain.mjs [slug]
 */

import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const cronSecret = process.env.CRON_SECRET?.trim();
const authToken = serviceRoleKey ?? cronSecret;
const authMode = serviceRoleKey
  ? "SUPABASE_SERVICE_ROLE_KEY"
  : cronSecret
    ? "CRON_SECRET"
    : null;
const slug =
  process.argv[2]?.trim().toLowerCase() ||
  `test-provision-${Date.now().toString(36)}`;

if (!supabaseUrl || !authToken) {
  console.error(
    "[smoke] Faltan NEXT_PUBLIC_SUPABASE_URL y un token de auth (SUPABASE_SERVICE_ROLE_KEY o CRON_SECRET) en .env.local",
  );
  process.exit(1);
}

console.log("[smoke] auth:", authMode);

const storeId = randomUUID();
const url = `${supabaseUrl}/functions/v1/provision-store-subdomain`;

console.log("[smoke] Invocando Edge Function...");
console.log("[smoke] slug:", slug);
console.log("[smoke] storeId:", storeId);

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${authToken}`,
    ...(serviceRoleKey ? { apikey: serviceRoleKey } : {}),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "provision",
    storeId,
    slug,
  }),
});

const body = await response.json().catch(() => null);

console.log("[smoke] HTTP status:", response.status);
console.log("[smoke] Response:", JSON.stringify(body, null, 2));

console.log("\n[smoke] === CHECKLIST ===");
const edgeAuthOk = response.status !== 401;
const provisionOk = response.ok && body?.ok && !body?.error;
const notSkipped = edgeAuthOk && body?.skipped !== true;

console.log(
  edgeAuthOk ? "[✓]" : "[✗]",
  "Auth Edge Function (no 401):",
  edgeAuthOk ? "OK" : "FALLÓ — token no coincide con secrets de Supabase",
);
console.log(
  provisionOk ? "[✓]" : "[✗]",
  'Evento "success" en Supabase (ok:true, sin error):',
  provisionOk ? "OK" : body?.error ?? `HTTP ${response.status}`,
);
console.log(
  notSkipped ? "[✓]" : "[~]",
  "Provisioning ejecutado (skipped:false):",
  notSkipped ? "OK" : "OMITIDO — revisa STORE_SUBDOMAIN_PROVISION_ENABLED y secrets",
);
console.log(
  "[?]",
  "Logs Vercel (edge_invoke_success):",
  "Solo aplica tras onboarding en producción — revisa Vercel → Logs",
);

if (response.status === 401) {
  console.log("\n[smoke] Fix auth: copia CRON_SECRET de Supabase secrets a .env.local,");
  console.log("[smoke] o sincroniza SUPABASE_SERVICE_ROLE_KEY con Dashboard → Settings → API.");
}

if (body?.error?.includes("credenciales") || body?.skipped) {
  console.log("\n[smoke] Fix secrets: configura en Supabase:");
  console.log("  STORE_SUBDOMAIN_PROVISION_ENABLED=true");
  console.log("  CLOUDFLARE_ZONE_ID=<zone id de alcentimo.com>");
}

if (provisionOk) {
  console.log("\n[smoke] OK — revisa logs en Supabase → Edge Functions → provision-store-subdomain → Logs");
  console.log("[smoke] Busca: \"event\":\"success\" y scope \"store-subdomain-provision\"");
  process.exit(0);
}

console.error("\n[smoke] Falló — revisa secrets en Supabase y permisos de Cloudflare/Vercel.");
process.exit(1);
