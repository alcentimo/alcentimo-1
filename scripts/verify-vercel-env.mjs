/**
 * Verifica variables de entorno en despliegues Vercel.
 * Se ejecuta antes del build (npm run vercel-build).
 *
 * - Producción: falla solo si faltan variables core (Supabase + SITE_URL).
 * - Preview: solo advierte en logs (no bloquea el build).
 */

const CORE = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

const SERVER = ["SUPABASE_SERVICE_ROLE_KEY"];

function envValue(name) {
  return process.env[name]?.trim() ?? "";
}

function missingRequired(vars) {
  return vars.filter((name) => !envValue(name));
}

function logRequiredSection(title, vars) {
  const absent = missingRequired(vars);
  if (absent.length === 0) {
    console.log(`[vercel-env] OK ${title}`);
    return [];
  }
  console.warn(`[vercel-env] Faltan (${title}): ${absent.join(", ")}`);
  return absent;
}

const isVercel = process.env.VERCEL === "1";
const isProduction = process.env.VERCEL_ENV === "production";

if (!isVercel) {
  console.log("[vercel-env] Entorno local — verificación omitida.");
  process.exit(0);
}

console.log(`[vercel-env] Verificando variables (${process.env.VERCEL_ENV})…`);

const missingCore = logRequiredSection("core", CORE);
const missingServer = logRequiredSection("servidor", SERVER);

const siteUrl = envValue("NEXT_PUBLIC_SITE_URL");
if (siteUrl && !/^https:\/\//i.test(siteUrl)) {
  console.warn(
    "[vercel-env] NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción:",
    siteUrl,
  );
}

const blockingMissing = [...missingCore];

if (isProduction && missingServer.length > 0) {
  console.warn(
    "[vercel-env] Faltan variables de servidor (webhooks/cron no funcionarán):",
    missingServer.join(", "),
  );
}

if (isProduction && blockingMissing.length > 0) {
  console.error(
    "[vercel-env] Build abortado: configura las variables core en Vercel → Settings → Environment Variables.",
  );
  process.exit(1);
}

if (blockingMissing.length > 0 && !isProduction) {
  console.warn(
    "[vercel-env] Preview deployment: build continúa, pero faltan variables core.",
  );
}

console.log("[vercel-env] Verificación completada.");
