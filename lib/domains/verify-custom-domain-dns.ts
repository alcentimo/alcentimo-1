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

const VERCEL_CNAME_HOSTS = new Set([
  "cname.vercel-dns.com",
  "cname.vercel-dns-0.com",
  "cname.vercel-dns-1.com",
  "cname.vercel-dns-2.com",
]);

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

  const apexTarget = getCustomDomainApexATarget();
  if (apexTarget) {
    aTargets.add(normalizeHost(apexTarget));
  }

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

function hostsToVerify(domain: string): string[] {
  if (isApexCustomDomain(domain)) {
    return [domain, `www.${domain}`];
  }

  return [domain];
}

function expectedCnameDisplay(): string {
  return getCustomDomainCnameTarget();
}

function expectedADisplay(): string | null {
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

function buildSuggestions(
  domain: string,
  checks: DnsCheckDetail[],
): string[] {
  const suggestions: string[] = [];
  const cnameTarget = expectedCnameDisplay();
  const aTarget = expectedADisplay();
  const dnsHost = getCustomDomainDnsHostLabel(domain);
  const isApex = isApexCustomDomain(domain);

  if (isApex) {
    suggestions.push(
      `En tu proveedor (GoDaddy, Cloudflare, Namecheap, etc.), crea un CNAME: host **www** → destino **${cnameTarget}**.`,
    );
    if (aTarget) {
      suggestions.push(
        `Si quieres usar ${domain} sin www, agrega un registro **A** en host **@** apuntando a **${aTarget}**.`,
      );
    } else {
      suggestions.push(
        "Para el dominio raíz (@), algunos proveedores no permiten CNAME; usa www o contacta soporte.",
      );
    }
  } else {
    suggestions.push(
      `Crea un registro **CNAME** con host **${dnsHost === "@" ? domain.split(".")[0] : dnsHost}** apuntando a **${cnameTarget}**.`,
    );
  }

  suggestions.push(
    "Elimina registros A o CNAME antiguos que apunten a otro servicio (p. ej. parking o WordPress).",
  );
  suggestions.push(
    "Si acabas de cambiar el DNS, espera entre 5 minutos y 24 horas y vuelve a verificar.",
  );

  const failed = checks.filter((check) => !check.ok);
  if (failed.some((check) => check.recordType === "CNAME")) {
    suggestions.unshift(
      `El CNAME debe coincidir exactamente con **${cnameTarget}** (sin https:// ni rutas).`,
    );
  }

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
  let anyOk = false;

  for (const host of hostsToVerify(domain)) {
    const cnameRecords = await safeResolveCname(host);
    const expectedCname = expectedCnameDisplay();

    if (cnameRecords?.length) {
      const match = cnameRecords.find((record) => cnameMatchesTarget(record, cnameTargets));
      checks.push({
        host,
        recordType: "CNAME",
        expected: expectedCname,
        actual: cnameRecords.join(", "),
        ok: Boolean(match),
        note: host.startsWith("www.") ? "Recomendado para dominio raíz" : undefined,
      });
      if (match) anyOk = true;
      continue;
    }

    const aRecords = await safeResolveA(host);
    const expectedA = expectedADisplay();

    if (aRecords?.length && expectedA) {
      const match = aRecords.find((record) => aMatchesTarget(record, aTargets));
      checks.push({
        host,
        recordType: "A",
        expected: expectedA,
        actual: aRecords.join(", "),
        ok: Boolean(match),
        note: "Registro A para dominio raíz (@)",
      });
      if (match) anyOk = true;
      continue;
    }

    if (aRecords?.length && !expectedA) {
      checks.push({
        host,
        recordType: "A",
        expected: expectedCname,
        actual: aRecords.join(", "),
        ok: false,
        note: "Se encontró A, pero se esperaba CNAME hacia Alcentimo.",
      });
      continue;
    }

    checks.push({
      host,
      recordType: "CNAME",
      expected: expectedCname,
      actual: null,
      ok: false,
      note: "No encontramos CNAME ni A válido para este host.",
    });
  }

  if (anyOk) {
    return {
      ok: true,
      status: "success",
      message: "Conexión DNS correcta",
      summary:
        "Detectamos que tu dominio ya apunta a Alcentimo. Activaremos la URL pública en cuanto confirmes.",
      checks,
      suggestions: [],
    };
  }

  const suggestions = buildSuggestions(domain, checks);
  const hasAnyRecord = checks.some((check) => check.actual);

  return {
    ok: false,
    status: hasAnyRecord ? "error" : "pending",
    message: hasAnyRecord
      ? "DNS detectado, pero aún no apunta a Alcentimo"
      : "Aún no detectamos los registros DNS",
    summary: hasAnyRecord
      ? "Encontramos registros, pero no coinciden con lo que necesita la plataforma. Revisa la tabla y corrige en tu proveedor."
      : "Todavía no vemos el CNAME o registro A configurado. Si ya lo creaste, puede estar propagándose.",
    checks,
    suggestions,
  };
}
