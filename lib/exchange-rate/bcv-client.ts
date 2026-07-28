const BCV_API_ENDPOINTS = [
  "https://bcv.today/api/v1/rate.json",
  "https://ve.dolarapi.com/v1/dolares/oficial",
] as const;

const FETCH_TIMEOUT_MS = 12_000;
const FETCH_ATTEMPTS_PER_ENDPOINT = 3;
const RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function fetchRateFromEndpoint(endpoint: string): Promise<number> {
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
        console.log(
          `[bcv-sync] ${JSON.stringify({
            ts: new Date().toISOString(),
            phase: "fetch_endpoint_ok",
            endpoint,
            attempt,
            rate: rounded,
            rawRate: rate,
          })}`,
        );
        return rounded;
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

/** Obtiene la tasa USD/VES publicada por el BCV desde APIs públicas (2 decimales). */
export async function fetchBcvUsdRate(): Promise<number> {
  const errors: string[] = [];

  for (const endpoint of BCV_API_ENDPOINTS) {
    try {
      return await fetchRateFromEndpoint(endpoint);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      errors.push(message);
    }
  }

  throw new Error(
    errors.length > 0
      ? `No se pudo obtener la tasa BCV tras reintentos. ${errors.join(" | ")}`
      : "No se pudo obtener la tasa BCV.",
  );
}
