import {
  getCustomDomainApexATarget,
  getCustomDomainCnameTarget,
  getCustomDomainDnsHostLabel,
  isApexCustomDomain,
  normalizeCustomDomain,
} from "@/lib/domains/custom-domain";
import { getApexSiteHost, getPublicSiteHost } from "@/lib/site-url";

export type DnsVerificationStatus = "success" | "pending" | "error";

export interface DnsCheckDetail {
  host: string;
  recordType: "CNAME" | "A";
  expected: string;
  actual: string | null;
  ok: boolean;
  note?: string;
}

export interface CustomDomainDnsVerificationResult {
  ok: boolean;
  status: DnsVerificationStatus;
  message: string;
  summary: string;
  checks: DnsCheckDetail[];
  suggestions: string[];
}

/** Destinos CNAME aceptados además de alcentimo.com (compat. Vercel). */
const VERCEL_CNAME_HOSTS = new Set([
  "cname.vercel-dns.com",
  "cname.vercel-dns-0.com",
  "cname.vercel-dns-1.com",
  "cname.vercel-dns-2.com",
]);

/** IPs A aceptadas para dominio raíz (@). */
const VERCEL_A_RECORDS = new Set(["76.76.21.21", "216.150.1.1"]);

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function isDnsNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENODATA" || code === "ENOTFOUND" || code === "ESERVFAIL";
}

function buildAcceptedTargets(): {
  cnameTargets: Set<string>;
  aTargets: Set<string>;
} {
  const cnameTargets = new Set<string>();
  const aTargets = new Set<string>();

  for (const host of [
    getCustomDomainCnameTarget(),
    getPublicSiteHost(),
    getApexSiteHost(),
    `www.${getApexSiteHost()}`,
  ]) {
    cnameTargets.add(normalizeHost(host));
  }

  for (const host of VERCEL_CNAME_HOSTS) {
    cnameTargets.add(host);
  }

  aTargets.add(normalizeHost(getCustomDomainApexATarget()));
  for (const ip of VERCEL_A_RECORDS) {
    aTargets.add(ip);
  }

  return { cnameTargets, aTargets };
}

function cnameMatchesTarget(actual: string, accepted: Set<string>): boolean {
  const normalized = normalizeHost(actual);
  if (accepted.has(normalized)) return true;

  for (const target of accepted) {
    if (normalized === target || normalized.endsWith(`.${target}`)) {
      return true;
    }
  }

  return VERCEL_CNAME_HOSTS.has(normalized);
}

function aMatchesTarget(actual: string, accepted: Set<string>): boolean {
  const normalized = normalizeHost(actual);
  return accepted.has(normalized) || VERCEL_A_RECORDS.has(normalized);
}

function expectedCnameDisplay(): string {
  return getCustomDomainCnameTarget();
}

function expectedADisplay(): string {
  return getCustomDomainApexATarget();
}

async function safeResolveCname(host: string): Promise<string[] | null> {
  const dns = await import("node:dns");
  try {
    const records = await dns.promises.resolveCname(host);
    return records.map(normalizeHost);
  } catch (error) {
    if (isDnsNotFoundError(error)) return null;
    throw error;
  }
}

async function safeResolveA(host: string): Promise<string[] | null> {
  const dns = await import("node:dns");
  try {
    const records = await dns.promises.resolve4(host);
    return records.map(normalizeHost);
  } catch (error) {
    if (isDnsNotFoundError(error)) return null;
    throw error;
  }
}

/**
 * www / subdominio: solo CNAME → alcentimo.com.
 * No exige ni espera registro A en www.
 */
async function checkCnameHost(
  host: string,
  cnameTargets: Set<string>,
): Promise<DnsCheckDetail> {
  const expected = expectedCnameDisplay();
  const cnameRecords = await safeResolveCname(host);

  if (cnameRecords?.length) {
    const match = cnameRecords.find((record) =>
      cnameMatchesTarget(record, cnameTargets),
    );
    return {
      host,
      recordType: "CNAME",
      expected,
      actual: cnameRecords.join(", "),
      ok: Boolean(match),
      note: host.startsWith("www.")
        ? "www → CNAME (estándar; no uses A aquí)"
        : "Subdominio → CNAME",
    };
  }

  // Si solo hay A en www, no lo validamos como correcto: el estándar es CNAME.
  const aRecords = await safeResolveA(host);
  if (aRecords?.length) {
    return {
      host,
      recordType: "CNAME",
      expected,
      actual: `registro A (${aRecords.join(", ")})`,
      ok: false,
      note: `Para ${host.startsWith("www.") ? "www" : "este host"} usa CNAME → ${expected}, no un registro A.`,
    };
  }

  return {
    host,
    recordType: "CNAME",
    expected,
    actual: null,
    ok: false,
    note: host.startsWith("www.")
      ? `Falta CNAME en www → ${expected}`
      : `Falta CNAME → ${expected}`,
  };
}

/**
 * Dominio raíz (@): solo registro A → 76.76.21.21.
 * No exige CNAME en el apex.
 */
async function checkApexAHost(
  host: string,
  aTargets: Set<string>,
): Promise<DnsCheckDetail> {
  const expected = expectedADisplay();
  const aRecords = await safeResolveA(host);

  if (aRecords?.length) {
    const match = aRecords.find((record) => aMatchesTarget(record, aTargets));
    return {
      host,
      recordType: "A",
      expected,
      actual: aRecords.join(", "),
      ok: Boolean(match),
      note: "Dominio raíz (@) → registro A",
    };
  }

  // Apex sin A: no pedir CNAME como “esperado” (contradice la guía).
  return {
    host,
    recordType: "A",
    expected,
    actual: null,
    ok: false,
    note: `Falta registro A en @ → ${expected}`,
  };
}

function buildSuggestions(
  domain: string,
  checks: DnsCheckDetail[],
): string[] {
  const suggestions: string[] = [];
  const cnameTarget = expectedCnameDisplay();
  const aTarget = expectedADisplay();
  const dnsHost = getCustomDomainDnsHostLabel(domain);
  const isApex = isApexCustomDomain(domain);
  const failed = checks.filter((check) => !check.ok);

  const wwwFailed = failed.some(
    (check) =>
      check.recordType === "CNAME" &&
      (check.host.startsWith("www.") || (!isApex && check.host === domain)),
  );
  const apexFailed = failed.some(
    (check) => check.recordType === "A" && check.host === domain,
  );

  if (isApex) {
    if (wwwFailed) {
      suggestions.push(
        `Para la versión con www: crea un **CNAME** con host **www** apuntando a **${cnameTarget}** (no uses un registro A en www).`,
      );
    }
    if (apexFailed) {
      suggestions.push(
        `Para el dominio raíz (@): crea un registro **A** apuntando a la IP **${aTarget}**.`,
      );
    }
    if (!wwwFailed && !apexFailed) {
      suggestions.push(
        `www → **CNAME** a **${cnameTarget}**; @ → **A** a **${aTarget}**.`,
      );
    }
  } else if (wwwFailed || failed.length > 0) {
    suggestions.push(
      `Crea un registro **CNAME** con host **${dnsHost === "@" ? domain.split(".")[0] : dnsHost}** apuntando a **${cnameTarget}**.`,
    );
  }

  suggestions.push(
    "Elimina registros antiguos que apunten a otro servicio (parking, WordPress, etc.).",
  );
  suggestions.push(
    "Si acabas de cambiar el DNS, espera entre 5 minutos y 24 horas y vuelve a comprobar.",
  );

  return [...new Set(suggestions)];
}

export async function verifyCustomDomainDns(
  domainInput: string,
): Promise<CustomDomainDnsVerificationResult> {
  const domain = normalizeCustomDomain(domainInput);
  if (!domain) {
    return {
      ok: false,
      status: "error",
      message: "Dominio inválido",
      summary: "Ingresa un dominio válido antes de verificar la conexión.",
      checks: [],
      suggestions: [
        "Usa el formato tutienda.com o tienda.tudominio.com, sin http://.",
      ],
    };
  }

  const { cnameTargets, aTargets } = buildAcceptedTargets();
  const checks: DnsCheckDetail[] = [];
  const isApex = isApexCustomDomain(domain);

  if (isApex) {
    // Estándar Vercel/DNS: www = CNAME; apex (@) = A. Sin mezclar.
    checks.push(await checkCnameHost(`www.${domain}`, cnameTargets));
    checks.push(await checkApexAHost(domain, aTargets));
  } else {
    // Subdominio (tienda.tudominio.com): solo CNAME.
    checks.push(await checkCnameHost(domain, cnameTargets));
  }

  // Con dominio apex basta con que www O @ apunten bien para activar.
  // (No exigimos A en www ni CNAME en @.)
  const ok = checks.some((check) => check.ok);

  if (ok) {
    const wwwOk = checks.some(
      (check) => check.recordType === "CNAME" && check.ok,
    );
    const apexOk = checks.some(
      (check) => check.recordType === "A" && check.ok,
    );
    const summaryParts: string[] = [];
    if (wwwOk) summaryParts.push("www con CNAME");
    if (apexOk) summaryParts.push("raíz (@) con registro A");

    return {
      ok: true,
      status: "success",
      message: "Conexión correcta",
      summary:
        summaryParts.length > 0
          ? `Detectamos ${summaryParts.join(" y ")}. Activamos la dirección segura automáticamente.`
          : "Tu dominio ya apunta a Alcéntimo. Activamos la dirección segura automáticamente.",
      checks,
      suggestions: [],
    };
  }

  const suggestions = buildSuggestions(domain, checks);
  const hasAnyRecord = checks.some((check) => check.actual);
  const cnameTarget = expectedCnameDisplay();
  const aTarget = expectedADisplay();

  return {
    ok: false,
    status: hasAnyRecord ? "error" : "pending",
    message: hasAnyRecord
      ? "Hay que ajustar el destino"
      : "Aún no lo vemos listo",
    summary: isApex
      ? hasAnyRecord
        ? `Encontramos una configuración, pero no coincide: www → CNAME a ${cnameTarget}; @ → A a ${aTarget}.`
        : `Todavía no vemos los registros. Recuerda: www usa CNAME a ${cnameTarget}; el dominio raíz (@) usa A a ${aTarget}.`
      : hasAnyRecord
        ? `Encontramos una configuración, pero el CNAME no apunta a ${cnameTarget}.`
        : `Todavía no vemos el CNAME apuntando a ${cnameTarget}.`,
    checks,
    suggestions,
  };
}
