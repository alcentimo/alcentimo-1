/**
 * Cliente server-side para registrar dominios personalizados en el proyecto Vercel.
 * Usa VERCEL_API_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID opcional).
 */

const VERCEL_API = "https://api.vercel.com";

export interface VercelProjectDomainConfig {
  apiToken: string;
  projectId: string;
  teamId: string | null;
}

export type EnsureVercelDomainResult =
  | {
      ok: true;
      created: boolean;
      misconfigured: boolean;
      cnameTarget: string | null;
      sslReady: boolean;
    }
  | { ok: false; error: string };

type VercelErrorBody = {
  error?: { message?: string; code?: string };
};

type VercelDomainConfigBody = {
  misconfigured?: boolean;
  recommendedCNAME?: Array<{ rank: number; value: string }>;
  configuredBy?: string | null;
};

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getVercelProjectDomainConfig(): VercelProjectDomainConfig | null {
  const apiToken = optionalEnv("VERCEL_API_TOKEN");
  const projectId = optionalEnv("VERCEL_PROJECT_ID");
  if (!apiToken || !projectId) return null;

  return {
    apiToken,
    projectId,
    teamId: optionalEnv("VERCEL_TEAM_ID") ?? null,
  };
}

/** Activo cuando hay credenciales, salvo override explícito. */
export function isVercelCustomDomainProvisioningEnabled(): boolean {
  if (process.env.CUSTOM_DOMAIN_VERCEL_PROVISION_ENABLED === "false") {
    return false;
  }
  if (process.env.CUSTOM_DOMAIN_VERCEL_PROVISION_ENABLED === "true") {
    return Boolean(getVercelProjectDomainConfig());
  }
  return Boolean(getVercelProjectDomainConfig());
}

function withTeamQuery(path: string, teamId: string | null): string {
  if (!teamId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}teamId=${encodeURIComponent(teamId)}`;
}

/** Lista / alta: /v10/projects/{id}/domains(?teamId=) */
function projectDomainsCollectionPath(
  config: VercelProjectDomainConfig,
): string {
  return withTeamQuery(
    `/v10/projects/${config.projectId}/domains`,
    config.teamId,
  );
}

/**
 * Dominio concreto: el path del dominio va ANTES del query teamId.
 * Incorrecto: /domains?teamId=x/midominio.com
 * Correcto:   /domains/midominio.com?teamId=x
 */
function projectDomainItemPath(
  config: VercelProjectDomainConfig,
  domain: string,
): string {
  return withTeamQuery(
    `/v10/projects/${config.projectId}/domains/${encodeURIComponent(domain)}`,
    config.teamId,
  );
}

function domainConfigPath(
  config: VercelProjectDomainConfig,
  domain: string,
): string {
  return withTeamQuery(
    `/v6/domains/${encodeURIComponent(domain)}/config`,
    config.teamId,
  );
}

function vercelHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function logVercelDomain(
  event: string,
  payload: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
) {
  const body = JSON.stringify({
    scope: "custom-domain-vercel",
    event,
    ...payload,
  });
  if (level === "error") {
    console.error(body);
    return;
  }
  if (level === "warn") {
    console.warn(body);
    return;
  }
  console.info(body);
}

function mapVercelErrorMessage(raw: string, status: number): string {
  const lower = raw.toLowerCase();
  if (lower.includes("forbidden") || status === 403) {
    return "No hay permiso para registrar dominios en Vercel. Revisa VERCEL_API_TOKEN.";
  }
  if (lower.includes("not found") && status === 404) {
    return "Proyecto de Vercel no encontrado. Revisa VERCEL_PROJECT_ID.";
  }
  if (lower.includes("already") || lower.includes("exists") || status === 409) {
    return "El dominio ya está registrado en otro proyecto de Vercel.";
  }
  if (lower.includes("invalid")) {
    return "El dominio no es válido para Vercel.";
  }
  return raw || `Error de Vercel (${status}).`;
}

async function fetchDomainConfig(
  config: VercelProjectDomainConfig,
  domain: string,
): Promise<VercelDomainConfigBody | null> {
  const response = await fetch(
    `${VERCEL_API}${domainConfigPath(config, domain)}`,
    {
      method: "GET",
      headers: vercelHeaders(config.apiToken),
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as VercelDomainConfigBody | null;
}

async function addDomainToProject(
  config: VercelProjectDomainConfig,
  domain: string,
  redirectTo?: string | null,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const collectionPath = projectDomainsCollectionPath(config);
  const itemPath = projectDomainItemPath(config, domain);
  const getRes = await fetch(`${VERCEL_API}${itemPath}`, {
    method: "GET",
    headers: vercelHeaders(config.apiToken),
    cache: "no-store",
  });

  if (getRes.ok) {
    return { ok: true, created: false };
  }

  if (getRes.status !== 404) {
    const body = (await getRes.json().catch(() => null)) as VercelErrorBody | null;
    const message = body?.error?.message ?? "";
    const shouldTryCreate =
      getRes.status === 400 ||
      message.toLowerCase().includes("no route") ||
      message.toLowerCase().includes("not found");

    if (!shouldTryCreate) {
      return {
        ok: false,
        error: mapVercelErrorMessage(message, getRes.status),
      };
    }
  }

  const payload: Record<string, unknown> = { name: domain };
  if (redirectTo) {
    payload.redirect = redirectTo;
    payload.redirectStatusCode = 308;
  }

  const createRes = await fetch(`${VERCEL_API}${collectionPath}`, {
    method: "POST",
    headers: vercelHeaders(config.apiToken),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const createJson = (await createRes.json().catch(() => null)) as VercelErrorBody | null;
  if (!createRes.ok) {
    const message = createJson?.error?.message ?? "";
    if (
      createRes.status === 409 ||
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("exists")
    ) {
      return { ok: true, created: false };
    }
    return {
      ok: false,
      error: mapVercelErrorMessage(message, createRes.status),
    };
  }

  return { ok: true, created: true };
}

async function deleteDomainFromProject(
  config: VercelProjectDomainConfig,
  domain: string,
): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const itemPath = projectDomainItemPath(config, domain);
  const deleteRes = await fetch(`${VERCEL_API}${itemPath}`, {
    method: "DELETE",
    headers: vercelHeaders(config.apiToken),
    cache: "no-store",
  });

  if (deleteRes.status === 404) {
    return { ok: true, removed: false };
  }

  if (!deleteRes.ok) {
    const body = (await deleteRes.json().catch(() => null)) as VercelErrorBody | null;
    return {
      ok: false,
      error: mapVercelErrorMessage(
        body?.error?.message ?? "",
        deleteRes.status,
      ),
    };
  }

  return { ok: true, removed: true };
}

/**
 * Registra el dominio (y www → apex si aplica) en el proyecto Vercel.
 * El certificado SSL lo emite Vercel automáticamente cuando el DNS es correcto.
 */
export async function ensureVercelCustomDomain(
  domain: string,
  options?: { alsoProvisionWww?: boolean },
): Promise<EnsureVercelDomainResult> {
  const config = getVercelProjectDomainConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Falta configuración de Vercel (VERCEL_API_TOKEN / VERCEL_PROJECT_ID) para registrar el dominio.",
    };
  }

  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) {
    return { ok: false, error: "Dominio inválido." };
  }

  try {
    const addResult = await addDomainToProject(config, normalized);
    if (!addResult.ok) {
      logVercelDomain(
        "ensure_failed",
        { domain: normalized, error: addResult.error },
        "error",
      );
      return addResult;
    }

    const labels = normalized.split(".").filter(Boolean);
    const isApex = labels.length === 2;
    if (options?.alsoProvisionWww !== false && isApex) {
      const wwwDomain = `www.${normalized}`;
      const wwwResult = await addDomainToProject(config, wwwDomain, normalized);
      if (!wwwResult.ok) {
        logVercelDomain(
          "ensure_www_failed",
          { domain: wwwDomain, error: wwwResult.error },
          "warn",
        );
        // No bloquear el apex si www falla (p. ej. ya existe en otro sitio).
      }
    }

    const domainConfig = await fetchDomainConfig(config, normalized);
    const recommended = domainConfig?.recommendedCNAME
      ?.slice()
      .sort((a, b) => a.rank - b.rank)[0]?.value;
    const cnameTarget = recommended
      ? recommended.replace(/\.$/, "")
      : optionalEnv("VERCEL_DNS_CNAME_TARGET") ?? "cname.vercel-dns.com";

    const misconfigured = Boolean(domainConfig?.misconfigured);
    logVercelDomain("ensure_success", {
      domain: normalized,
      created: addResult.created,
      misconfigured,
    });

    return {
      ok: true,
      created: addResult.created,
      misconfigured,
      cnameTarget,
      sslReady: !misconfigured,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al contactar Vercel.";
    logVercelDomain(
      "ensure_exception",
      { domain: normalized, error: message },
      "error",
    );
    return { ok: false, error: message };
  }
}

/** Quita el dominio (y www asociado si es apex) del proyecto Vercel. */
export async function removeVercelCustomDomain(
  domain: string,
): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const config = getVercelProjectDomainConfig();
  if (!config) {
    return { ok: true, removed: false };
  }

  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) {
    return { ok: true, removed: false };
  }

  try {
    const labels = normalized.split(".").filter(Boolean);
    const isApex = labels.length === 2;

    const primary = await deleteDomainFromProject(config, normalized);
    if (!primary.ok) {
      logVercelDomain(
        "remove_failed",
        { domain: normalized, error: primary.error },
        "error",
      );
      return primary;
    }

    if (isApex) {
      const wwwResult = await deleteDomainFromProject(
        config,
        `www.${normalized}`,
      );
      if (!wwwResult.ok) {
        logVercelDomain(
          "remove_www_failed",
          { domain: `www.${normalized}`, error: wwwResult.error },
          "warn",
        );
      }
    }

    logVercelDomain("remove_success", {
      domain: normalized,
      removed: primary.removed,
    });
    return primary;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al contactar Vercel.";
    logVercelDomain(
      "remove_exception",
      { domain: normalized, error: message },
      "error",
    );
    return { ok: false, error: message };
  }
}

/** Consulta si Vercel aún marca el dominio como misconfigured (DNS/SSL pendiente). */
export async function getVercelCustomDomainStatus(
  domain: string,
): Promise<
  | { ok: true; misconfigured: boolean; sslReady: boolean }
  | { ok: false; error: string }
> {
  const config = getVercelProjectDomainConfig();
  if (!config) {
    return {
      ok: false,
      error: "Falta configuración de Vercel para consultar el dominio.",
    };
  }

  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  try {
    const domainConfig = await fetchDomainConfig(config, normalized);
    if (!domainConfig) {
      return {
        ok: false,
        error: "No se pudo leer el estado del dominio en Vercel.",
      };
    }
    const misconfigured = Boolean(domainConfig.misconfigured);
    return {
      ok: true,
      misconfigured,
      sslReady: !misconfigured,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Error al consultar Vercel.",
    };
  }
}
