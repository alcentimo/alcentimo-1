import https from "node:https";
import {
  addCalendarDays,
  getVenezuelaHour,
  getVenezuelaNextBusinessDate,
  getVenezuelaNextSyncDate,
  getVenezuelaSyncDate,
  getVenezuelaWeekday,
  isVenezuelaWeekend,
} from "@/lib/exchange-rate/sync-date";

/** APIs públicas (espejos). El sitio oficial BCV se usa como último recurso. */
const BCV_API_ENDPOINTS = [
  "https://ve.dolarapi.com/v1/dolares/oficial",
  "https://bcv.today/api/v1/rate.json",
] as const;

const BCV_OFFICIAL_URL = "https://www.bcv.org.ve/";

const FETCH_TIMEOUT_MS = 12_000;
const FETCH_ATTEMPTS_PER_ENDPOINT = 3;
const RETRY_BASE_DELAY_MS = 800;

export interface BcvRateFetchResult {
  rate: number;
  /** Fecha de vigencia reportada por la fuente (YYYY-MM-DD), si existe. */
  sourceEffectiveDate: string | null;
  source: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundRateTwoDecimals(rate: number): number {
  return Math.round((rate + Number.EPSILON) * 100) / 100;
}

function parseNumericRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Formato VE/EU: "742,8105" o "1.742,81"
    if (trimmed.includes(",")) {
      const normalized = trimmed.replace(/\./g, "").replace(",", ".");
      const parsed = Number.parseFloat(normalized);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return null;
    }

    // Formato US/API: "742.8105"
    const parsed = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

/** Extrae YYYY-MM-DD de campos típicos de APIs BCV. */
export function parseSourceEffectiveDate(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  const candidates = [
    data.effective_date,
    data.date,
    data.fecha,
    data.fechaActualizacion,
    data.fecha_actualizacion,
    data.updated_at,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const match = candidate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  return null;
}

function extractRateFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  const directCandidates = [
    data.USD,
    data.price,
    data.tasa,
    data.rate,
    data.valor,
    data.value,
    data.price_bcv,
    data.promedio,
    data.monto,
    data.mid,
  ];

  for (const candidate of directCandidates) {
    const parsed = parseNumericRate(candidate);
    if (parsed) return parsed;
  }

  const nestedUsd = data.usd;
  if (nestedUsd && typeof nestedUsd === "object") {
    const usd = nestedUsd as Record<string, unknown>;
    const parsed = parseNumericRate(usd.price ?? usd.valor ?? usd.value ?? usd.tasa);
    if (parsed) return parsed;
  }

  const nestedDolar = data.dolar;
  if (nestedDolar && typeof nestedDolar === "object") {
    const dolar = nestedDolar as Record<string, unknown>;
    const parsed = parseNumericRate(dolar.value ?? dolar.valor ?? dolar.price);
    if (parsed) return parsed;
  }

  const monitors = data.monitors;
  if (Array.isArray(monitors)) {
    for (const monitor of monitors) {
      if (!monitor || typeof monitor !== "object") continue;
      const row = monitor as Record<string, unknown>;
      const key = String(row.key ?? row.title ?? row.name ?? "").toLowerCase();
      if (key.includes("bcv") || key.includes("oficial")) {
        const parsed = parseNumericRate(row.price ?? row.valor ?? row.value);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

/**
 * Elige la cotización más fresca entre espejos.
 *
 * Día hábil (antes de la publicación vespertina): prioriza hoy.
 * Viernes ≥16:00 VE / finde: si hay tasa del próximo hábil (lunes), esa gana
 * (publicación BCV del viernes para el lunes).
 */
export function selectFreshestBcvRate(
  candidates: BcvRateFetchResult[],
  reference = new Date(),
): BcvRateFetchResult | null {
  if (candidates.length === 0) return null;

  const today = getVenezuelaSyncDate(reference);
  const tomorrow = getVenezuelaNextSyncDate(reference);
  const nextBiz = getVenezuelaNextBusinessDate(reference);
  const maxForward = addCalendarDays(today, 10);
  const hour = getVenezuelaHour(reference);
  const preferNextBusiness =
    isVenezuelaWeekend(reference) ||
    (getVenezuelaWeekday(reference) === 5 && hour >= 16);
  const hasNextBiz = candidates.some(
    (c) => c.sourceEffectiveDate?.trim() === nextBiz,
  );

  const scored = candidates.map((candidate) => {
    const date = candidate.sourceEffectiveDate?.trim() ?? "";
    let freshness = 0;
    if (preferNextBusiness && hasNextBiz && date === nextBiz) freshness = 450;
    else if (date === today) freshness = 400;
    else if (date === nextBiz) freshness = 380;
    else if (date === tomorrow) freshness = 300;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > today && date <= maxForward) {
      freshness = 250;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < today) freshness = 100;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > maxForward) freshness = 40;
    else freshness = 150; // sin fecha usable

    return { candidate, freshness, date };
  });

  scored.sort((a, b) => {
    if (b.freshness !== a.freshness) return b.freshness - a.freshness;
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    return 0;
  });

  return scored[0]?.candidate ?? null;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AlcentimoBCVSync/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRateFromEndpoint(
  endpoint: string,
): Promise<BcvRateFetchResult> {
  let lastError = "sin detalle";

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS_PER_ENDPOINT; attempt++) {
    try {
      console.log(
        `[bcv-sync] ${JSON.stringify({
          ts: new Date().toISOString(),
          phase: "fetch_endpoint",
          endpoint,
          attempt,
        })}`,
      );
      const payload = await fetchJson(endpoint);
      const rate = extractRateFromPayload(payload);
      if (rate) {
        const rounded = roundRateTwoDecimals(rate);
        const sourceEffectiveDate = parseSourceEffectiveDate(payload);
        console.log(
          `[bcv-sync] ${JSON.stringify({
            ts: new Date().toISOString(),
            phase: "fetch_endpoint_ok",
            endpoint,
            attempt,
            rate: rounded,
            rawRate: rate,
            sourceEffectiveDate,
          })}`,
        );
        return {
          rate: rounded,
          sourceEffectiveDate,
          source: endpoint,
        };
      }
      lastError = "respuesta sin tasa válida";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error desconocido";
      console.error(
        `[bcv-sync] ${JSON.stringify({
          ts: new Date().toISOString(),
          phase: "fetch_endpoint_error",
          endpoint,
          attempt,
          error: lastError,
        })}`,
      );
    }

    if (attempt < FETCH_ATTEMPTS_PER_ENDPOINT) {
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw new Error(`${endpoint}: ${lastError}`);
}

/** El certificado SSL de bcv.org.ve suele fallar; usamos Agent inseguro solo aquí. */
function fetchTextAllowInvalidCert(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; AlcentimoBCVSync/1.0; +https://alcentimo.com)",
        },
        timeout: FETCH_TIMEOUT_MS,
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

/** Parsea USD y Fecha Valor del HTML oficial del BCV. */
export function parseBcvOfficialHtml(html: string): BcvRateFetchResult | null {
  const dolarBlockMatch = html.match(
    /id=["']dolar["'][\s\S]{0,1200}?strong[^>]*>\s*([0-9][0-9.,]*)/i,
  );
  const rate = parseNumericRate(dolarBlockMatch?.[1] ?? null);
  if (!rate) return null;

  let sourceEffectiveDate: string | null = null;
  const fechaValorMatch = html.match(
    /Fecha\s*Valor[\s\S]{0,400}?content=["'](\d{4}-\d{2}-\d{2})/i,
  );
  if (fechaValorMatch?.[1]) {
    sourceEffectiveDate = fechaValorMatch[1];
  }

  return {
    rate: roundRateTwoDecimals(rate),
    sourceEffectiveDate,
    source: BCV_OFFICIAL_URL,
  };
}

async function fetchRateFromBcvOfficialSite(): Promise<BcvRateFetchResult> {
  console.log(
    `[bcv-sync] ${JSON.stringify({
      ts: new Date().toISOString(),
      phase: "fetch_bcv_official",
      endpoint: BCV_OFFICIAL_URL,
    })}`,
  );

  // 1) Intento normal (por si el cert se repara).
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(BCV_OFFICIAL_URL, {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; AlcentimoBCVSync/1.0; +https://alcentimo.com)",
        },
        cache: "no-store",
      });
      if (response.ok) {
        const html = await response.text();
        const parsed = parseBcvOfficialHtml(html);
        if (parsed) return parsed;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Certificado inválido u otro error de red: caer al Agent inseguro.
  }

  // 2) Fallback tolerante al certificado roto de bcv.org.ve.
  const html = await fetchTextAllowInvalidCert(BCV_OFFICIAL_URL);
  const parsed = parseBcvOfficialHtml(html);
  if (!parsed) {
    throw new Error(`${BCV_OFFICIAL_URL}: HTML sin tasa USD válida`);
  }

  console.log(
    `[bcv-sync] ${JSON.stringify({
      ts: new Date().toISOString(),
      phase: "fetch_bcv_official_ok",
      rate: parsed.rate,
      sourceEffectiveDate: parsed.sourceEffectiveDate,
    })}`,
  );

  return parsed;
}

/**
 * Obtiene la tasa USD/VES del BCV consultando varias fuentes en paralelo
 * y eligiendo la más fresca (no first-success).
 */
export async function fetchBcvUsdRate(): Promise<BcvRateFetchResult> {
  const errors: string[] = [];
  const candidates: BcvRateFetchResult[] = [];

  const apiResults = await Promise.allSettled(
    BCV_API_ENDPOINTS.map((endpoint) => fetchRateFromEndpoint(endpoint)),
  );

  for (let i = 0; i < apiResults.length; i++) {
    const result = apiResults[i];
    const endpoint = BCV_API_ENDPOINTS[i];
    if (result.status === "fulfilled") {
      candidates.push(result.value);
    } else {
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : `${endpoint}: Error desconocido`;
      errors.push(message);
    }
  }

  const today = getVenezuelaSyncDate();
  const nextBiz = getVenezuelaNextBusinessDate();
  const maxForward = addCalendarDays(today, 10);
  const bestFromApis = selectFreshestBcvRate(candidates);
  const bestDate = bestFromApis?.sourceEffectiveDate ?? null;
  const apisHaveFresh =
    bestDate === null ||
    bestDate === today ||
    bestDate === nextBiz ||
    (bestDate > today && bestDate <= maxForward);

  // Si ningún espejo trae vigencia actual/próxima, scrapear el BCV oficial.
  if (!bestFromApis || !apisHaveFresh) {
    try {
      const official = await fetchRateFromBcvOfficialSite();
      candidates.push(official);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${BCV_OFFICIAL_URL}: error`;
      errors.push(message);
      console.error(
        `[bcv-sync] ${JSON.stringify({
          ts: new Date().toISOString(),
          phase: "fetch_bcv_official_error",
          error: message,
        })}`,
      );
    }
  }

  const best = selectFreshestBcvRate(candidates);
  if (best) {
    console.log(
      `[bcv-sync] ${JSON.stringify({
        ts: new Date().toISOString(),
        phase: "fetch_selected",
        source: best.source,
        rate: best.rate,
        sourceEffectiveDate: best.sourceEffectiveDate,
        candidates: candidates.map((c) => ({
          source: c.source,
          rate: c.rate,
          sourceEffectiveDate: c.sourceEffectiveDate,
        })),
      })}`,
    );
    return best;
  }

  throw new Error(
    errors.length > 0
      ? `No se pudo obtener la tasa BCV tras reintentos. ${errors.join(" | ")}`
      : "No se pudo obtener la tasa BCV.",
  );
}
