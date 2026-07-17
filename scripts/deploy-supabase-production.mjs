#!/usr/bin/env node
/**
 * Despliega las Edge Functions BCV y sus crons en Supabase (producción).
 *
 * Requisitos previos (una sola vez):
 *   1. npx supabase login
 *   2. npx supabase secrets set CRON_SECRET=<tu-secreto> --project-ref pboxqwrogkwxkrjvbsqo
 *
 * Uso:
 *   npm run deploy:supabase:production
 */

import { spawnSync } from "node:child_process";

const PROJECT_REF = "pboxqwrogkwxkrjvbsqo";
const FUNCTIONS = ["sync-bcv", "sync-bcv-midnight", "sync-bcv-retry"];

console.log(`[deploy] Proyecto Supabase: ${PROJECT_REF}`);
console.log(`[deploy] Funciones: ${FUNCTIONS.join(", ")}`);

const result = spawnSync(
  "npx",
  [
    "supabase",
    "functions",
    "deploy",
    ...FUNCTIONS,
    "--project-ref",
    PROJECT_REF,
    "--no-verify-jwt",
  ],
  { stdio: "inherit", shell: true },
);

if ((result.status ?? 1) !== 0) {
  console.error("[deploy] Falló el despliegue. ¿Ejecutaste `npx supabase login`?");
  process.exit(result.status ?? 1);
}

const base = `https://${PROJECT_REF}.supabase.co/functions/v1`;
console.log("\n[deploy] Despliegue exitoso.");
console.log(`[deploy] Prueba manual: ${base}/sync-bcv?slot=midnight`);
console.log(`[deploy] Invocación medianoche: ${base}/sync-bcv-midnight`);
console.log(`[deploy] Invocación reintento 06:00: ${base}/sync-bcv-retry`);
console.log(
  "[deploy] Para cron automático en Supabase: Dashboard → Integrations → Cron, o pg_cron + pg_net (ver docs).",
);
console.log("[deploy] Cron principal en producción: Vercel → vercel.json");
