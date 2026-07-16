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
];

const SERVER = ["SUPABASE_SERVICE_ROLE_KEY"];

const META = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
];

const PLACEHOLDER_VALUES = new Set(["pending-configuration", "changeme", "xxx"]);

function missing(vars) {
  return vars.filter((name) => !process.env[name]?.trim());
}

function placeholder(vars) {
  return vars.filter((name) =>
    PLACEHOLDER_VALUES.has(process.env[name]?.trim() ?? ""),
  );
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
const missingServer = logSection("servidor", SERVER);
const missingMeta = logSection("Meta / WhatsApp", META);
const placeholderMeta = placeholder(META);
if (placeholderMeta.length > 0) {
  console.warn(
    `[vercel-env] Meta usa valores placeholder (${placeholderMeta.join(", ")}). OAuth de WhatsApp fallará hasta configurar IDs reales.`,
  );
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (siteUrl && !/^https:\/\//i.test(siteUrl)) {
  console.warn(
    "[vercel-env] NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción:",
    siteUrl,
  );
}

if (siteUrl && isProduction) {
  const redirectUri = `${siteUrl.replace(/\/$/, "")}/api/integrations/meta/callback`;
  console.log(
    "[vercel-env] Meta OAuth redirect_uri (registrar en Facebook Login → Configuración):",
    redirectUri,
  );
}

const blockingMissing = [...missingCore];

if (isProduction && missingServer.length > 0) {
  console.warn(
    "[vercel-env] Faltan variables de servidor (OAuth/webhooks no funcionarán):",
    missingServer.join(", "),
  );
}

const integrationMissing = [...missingMeta];
if (integrationMissing.length > 0) {
  console.warn(
    "[vercel-env] Integraciones pendientes (el build continúa):",
    integrationMissing.join(", "),
  );
}

if (isProduction && blockingMissing.length > 0) {
  console.error(
    "[vercel-env] Build abortado: configura las variables en Vercel → Settings → Environment Variables.",
  );
  process.exit(1);
}

if (blockingMissing.length > 0 && !isProduction) {
  console.warn(
    "[vercel-env] Preview deployment: build continúa, pero faltan variables core.",
  );
}

console.log("[vercel-env] Verificación completada.");
