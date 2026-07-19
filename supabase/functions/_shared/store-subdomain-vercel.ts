import type { DomainProvisioningConfig } from "./store-subdomain-config.ts";

const VERCEL_API = "https://api.vercel.com";

interface VercelDomainResponse {
  error?: { message?: string };
}

interface VercelDomainConfigResponse {
  misconfigured?: boolean;
  recommendedCNAME?: { rank: number; value: string }[];
}

function vercelProjectPath(config: DomainProvisioningConfig): string {
  const base = `/v10/projects/${config.vercelProjectId}/domains`;
  if (!config.vercelTeamId) return base;
  return `${base}?teamId=${encodeURIComponent(config.vercelTeamId)}`;
}

function vercelDomainConfigPath(
  config: DomainProvisioningConfig,
  domain: string,
): string {
  const base = `/v6/domains/${encodeURIComponent(domain)}/config`;
  if (!config.vercelTeamId) return base;
  return `${base}?teamId=${encodeURIComponent(config.vercelTeamId)}`;
}

function vercelHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function resolveVercelCnameTarget(
  config: DomainProvisioningConfig,
  domain: string,
): Promise<string> {
  const response = await fetch(
    `${VERCEL_API}${vercelDomainConfigPath(config, domain)}`,
    {
      method: "GET",
      headers: vercelHeaders(config.vercelApiToken),
    },
  );

  const body = (await response.json().catch(() => null)) as
    | VercelDomainConfigResponse
    | null;

  const recommended = body?.recommendedCNAME
    ?.slice()
    .sort((a, b) => a.rank - b.rank)[0]?.value;

  if (recommended) {
    return recommended.replace(/\.$/, "");
  }

  return config.vercelCnameTarget.replace(/\.$/, "");
}

export async function ensureVercelProjectDomain(
  config: DomainProvisioningConfig,
  slug: string,
): Promise<
  | { ok: true; created: boolean; cnameTarget: string; misconfigured?: boolean }
  | { ok: false; error: string }
> {
  const domain = `${slug}.${config.apexHost}`;
  const path = vercelProjectPath(config);

  const getRes = await fetch(`${VERCEL_API}${path}/${encodeURIComponent(domain)}`, {
    method: "GET",
    headers: vercelHeaders(config.vercelApiToken),
  });

  let created = false;

  if (!getRes.ok) {
    let getMessage = "";
    if (getRes.status !== 404) {
      const body = (await getRes.json().catch(() => null)) as
        | VercelDomainResponse
        | null;
      getMessage =
        body?.error?.message ?? `Vercel get domain failed (${getRes.status})`;

      const shouldTryCreate =
        getRes.status === 400 ||
        getMessage.toLowerCase().includes("no route") ||
        getMessage.toLowerCase().includes("not found");

      if (!shouldTryCreate) {
        return { ok: false, error: `Vercel: ${getMessage}` };
      }
    }

    const createRes = await fetch(`${VERCEL_API}${path}`, {
      method: "POST",
      headers: vercelHeaders(config.vercelApiToken),
      body: JSON.stringify({ name: domain }),
    });

    const createJson = (await createRes.json()) as VercelDomainResponse;
    if (!createRes.ok) {
      const message =
        createJson.error?.message ??
        `Vercel add domain failed (${createRes.status})`;

      if (
        createRes.status === 409 ||
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists")
      ) {
        created = false;
      } else {
        return { ok: false, error: `Vercel: ${message}` };
      }
    } else {
      created = true;
    }
  }

  const configRes = await fetch(
    `${VERCEL_API}${vercelDomainConfigPath(config, domain)}`,
    {
      method: "GET",
      headers: vercelHeaders(config.vercelApiToken),
    },
  );

  const domainConfig = (await configRes.json().catch(() => null)) as
    | VercelDomainConfigResponse
    | null;

  const cnameTarget = await resolveVercelCnameTarget(config, domain);

  return {
    ok: true,
    created,
    cnameTarget,
    misconfigured: domainConfig?.misconfigured,
  };
}

export async function removeVercelProjectDomain(
  config: DomainProvisioningConfig,
  slug: string,
): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const domain = `${slug}.${config.apexHost}`;
  const path = vercelProjectPath(config);

  const deleteRes = await fetch(
    `${VERCEL_API}${path}/${encodeURIComponent(domain)}`,
    {
      method: "DELETE",
      headers: vercelHeaders(config.vercelApiToken),
    },
  );

  if (deleteRes.status === 404) {
    return { ok: true, removed: false };
  }

  if (!deleteRes.ok) {
    const body = (await deleteRes.json().catch(() => null)) as
      | VercelDomainResponse
      | null;
    return {
      ok: false,
      error:
        body?.error?.message ??
        `Vercel remove domain failed (${deleteRes.status})`,
    };
  }

  return { ok: true, removed: true };
}
