/**
 * Verifica variables de entorno en despliegues Vercel.
 * Se ejecuta antes del build (npm run vercel-build).
 *
 * - Producción: falla si faltan variables core u de integraciones.
 * - Preview: solo advierte en logs (no bloquea el build).
 */

const CORE = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const META = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
];

const MERCADOLIBRE = ["ML_APP_ID", "ML_APP_SECRET"];

function missing(vars) {
  return vars.filter((name) => !process.env[name]?.trim());
}

function logSection(title, vars) {
  const absent = missing(vars);
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

const missingCore = logSection("core", CORE);
const missingMeta = logSection("Meta / WhatsApp", META);
const missingMl = logSection("MercadoLibre", MERCADOLIBRE);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (siteUrl && !/^https:\/\//i.test(siteUrl)) {
  console.warn(
    "[vercel-env] NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción:",
    siteUrl,
  );
}

const allMissing = [...missingCore, ...missingMeta, ...missingMl];

if (isProduction && allMissing.length > 0) {
  console.error(
    "[vercel-env] Build abortado: configura las variables en Vercel → Settings → Environment Variables.",
  );
  process.exit(1);
}

if (allMissing.length > 0) {
  console.warn(
    "[vercel-env] Preview deployment: build continúa, pero las integraciones no funcionarán hasta configurar las variables.",
  );
}

console.log("[vercel-env] Verificación completada.");
