import type { DomainProvisioningConfig } from "./store-subdomain-config.ts";

const VERCEL_API = "https://api.vercel.com";

interface VercelDomainResponse {
  error?: { message?: string };
}

function vercelProjectPath(config: DomainProvisioningConfig): string {
  const base = `/v10/projects/${config.vercelProjectId}/domains`;
  if (!config.vercelTeamId) return base;
  return `${base}?teamId=${encodeURIComponent(config.vercelTeamId)}`;
}

function vercelHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function ensureVercelProjectDomain(
  config: DomainProvisioningConfig,
  slug: string,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const domain = `${slug}.${config.apexHost}`;
  const path = vercelProjectPath(config);

  const getRes = await fetch(`${VERCEL_API}${path}/${encodeURIComponent(domain)}`, {
    method: "GET",
    headers: vercelHeaders(config.vercelApiToken),
  });

  if (getRes.ok) {
    return { ok: true, created: false };
  }

  if (getRes.status !== 404) {
    const body = (await getRes.json().catch(() => null)) as
      | VercelDomainResponse
      | null;
    return {
      ok: false,
      error:
        body?.error?.message ?? `Vercel get domain failed (${getRes.status})`,
    };
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
      return { ok: true, created: false };
    }

    return { ok: false, error: message };
  }

  return { ok: true, created: true };
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
