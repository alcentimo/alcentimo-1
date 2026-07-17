/**
 * Verifica variables de entorno en despliegues Vercel.
 * Se ejecuta antes del build (npm run vercel-build).
 *
 * - Producción: falla solo si faltan variables core (Supabase + SITE_URL).
 * - Integraciones (Meta, etc.): opcionales; el build continúa sin ellas.
 * - Preview: solo advierte en logs (no bloquea el build).
 */

const CORE = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

const SERVER = ["SUPABASE_SERVICE_ROLE_KEY"];

/** Integración opcional — ausencia no bloquea el build. */
const OPTIONAL_META = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
];

const PLACEHOLDER_VALUES = new Set(["pending-configuration", "changeme", "xxx"]);

function envValue(name) {
  return process.env[name]?.trim() ?? "";
}

function isConfigured(name) {
  const value = envValue(name);
  return value.length > 0 && !PLACEHOLDER_VALUES.has(value);
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

function logOptionalMeta(vars) {
  const configured = vars.filter(isConfigured);
  const allPlaceholderOrEmpty = vars.every((name) => {
    const value = envValue(name);
    return !value || PLACEHOLDER_VALUES.has(value);
  });

  if (allPlaceholderOrEmpty) {
    console.log(
      "[vercel-env] Meta / WhatsApp: omitido (opcional — no configurado)",
    );
    return { inUse: false, configured: false };
  }

  if (configured.length === vars.length) {
    console.log("[vercel-env] OK Meta / WhatsApp (opcional)");
    return { inUse: true, configured: true };
  }

  const incomplete = vars.filter((name) => !isConfigured(name));
  console.warn(
    `[vercel-env] Meta / WhatsApp: configuración incompleta (${incomplete.join(", ")}). OAuth y webhooks no funcionarán hasta completarla.`,
  );
  return { inUse: true, configured: false };
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
const metaStatus = logOptionalMeta(OPTIONAL_META);

const siteUrl = envValue("NEXT_PUBLIC_SITE_URL");
if (siteUrl && !/^https:\/\//i.test(siteUrl)) {
  console.warn(
    "[vercel-env] NEXT_PUBLIC_SITE_URL debería usar HTTPS en producción:",
    siteUrl,
  );
}

if (siteUrl && isProduction && metaStatus.configured) {
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
