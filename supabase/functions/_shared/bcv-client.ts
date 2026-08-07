const BCV_API_ENDPOINTS = [
  "https://ve.dolarapi.com/v1/dolares/oficial",
  "https://bcv.today/api/v1/rate.json",
] as const;

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

function getVenezuelaSyncDate(reference = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getVenezuelaNextSyncDate(reference = new Date()): string {
  return addCalendarDays(getVenezuelaSyncDate(reference), 1);
}

function getNextBusinessDate(fromDate: string): string {
  let cursor = addCalendarDays(fromDate, 1);
  for (let i = 0; i < 10; i++) {
    const [y, m, d] = cursor.split("-").map((part) => Number.parseInt(part, 10));
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) return cursor;
    cursor = addCalendarDays(cursor, 1);
  }
  return cursor;
}

function getVenezuelaNextBusinessDate(reference = new Date()): string {
  return getNextBusinessDate(getVenezuelaSyncDate(reference));
}

function parseNumericRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes(",")) {
      const normalized = trimmed.replace(/\./g, "").replace(",", ".");
      const parsed = Number.parseFloat(normalized);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return null;
    }

    const parsed = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

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
    const parsed = parseNumericRate(
      usd.price ?? usd.valor ?? usd.value ?? usd.tasa,
    );
    if (parsed) return parsed;
  }

  const nestedDolar = data.dolar;
  if (nestedDolar && typeof nestedDolar === "object") {
    const dolar = nestedDolar as Record<string, unknown>;
    const parsed = parseNumericRate(
      dolar.value ?? dolar.valor ?? dolar.price,
    );
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

function getVenezuelaWeekday(reference = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "short",
  }).format(reference);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

function getVenezuelaHourLocal(reference = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(reference)
    .find((part) => part.type === "hour")?.value;
  const hour = Number.parseInt(hourPart ?? "0", 10);
  if (!Number.isFinite(hour) || hour === 24) return 0;
  return hour;
}

/**
 * Elige la cotización más fresca entre espejos.
 * Viernes ≥16:00 / finde: prioriza el próximo hábil (lunes) si está presente.
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
  const weekday = getVenezuelaWeekday(reference);
  const hour = getVenezuelaHourLocal(reference);
  const preferNextBusiness =
    weekday === 0 || weekday === 6 || (weekday === 5 && hour >= 16);
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
    else freshness = 150;

    return { candidate, freshness, date };
  });

  scored.sort((a, b) => {
    if (b.freshness !== a.freshness) return b.freshness - a.freshness;
    if (a.date && b.date && a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
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

function roundRateTwoDecimals(rate: number): number {
  return Math.round((rate + Number.EPSILON) * 100) / 100;
}

async function fetchRateFromEndpoint(
  endpoint: string,
): Promise<BcvRateFetchResult> {
  let lastError = "sin detalle";

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS_PER_ENDPOINT; attempt++) {
    try {
      const payload = await fetchJson(endpoint);
      const rate = extractRateFromPayload(payload);
      if (rate) {
        return {
          rate: roundRateTwoDecimals(rate),
          sourceEffectiveDate: parseSourceEffectiveDate(payload),
          source: endpoint,
        };
      }
      lastError = "respuesta sin tasa válida";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Error desconocido";
    }

    if (attempt < FETCH_ATTEMPTS_PER_ENDPOINT) {
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw new Error(`${endpoint}: ${lastError}`);
}

/**
 * Consulta espejos en paralelo y elige la tasa más fresca.
 * (Sin scrape de bcv.org.ve aquí: el cert SSL suele fallar en Deno/Edge.)
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
      const message = result.reason instanceof Error
        ? result.reason.message
        : `${endpoint}: Error desconocido`;
      errors.push(message);
    }
  }

  const best = selectFreshestBcvRate(candidates);
  if (best) return best;

  throw new Error(
    errors.length > 0
      ? `No se pudo obtener la tasa BCV tras reintentos. ${errors.join(" | ")}`
      : "No se pudo obtener la tasa BCV.",
  );
}
