import type { DomainProvisioningConfig } from "./store-subdomain-config.ts";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

interface CloudflareDnsRecord {
  id: string;
  type: string;
  content: string;
}

interface CloudflareListResponse {
  success: boolean;
  result: CloudflareDnsRecord[];
  errors?: { message: string }[];
}

interface CloudflareCreateResponse {
  success: boolean;
  errors?: { message: string }[];
}

function cloudflareHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function recordFqdn(slug: string, apexHost: string): string {
  return `${slug}.${apexHost}`;
}

export async function ensureCloudflareStoreCname(
  config: DomainProvisioningConfig,
  slug: string,
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const fqdn = recordFqdn(slug, config.apexHost);
  const listUrl = new URL(
    `${CLOUDFLARE_API}/zones/${config.cloudflareZoneId}/dns_records`,
  );
  listUrl.searchParams.set("type", "CNAME");
  listUrl.searchParams.set("name", fqdn);

  const listRes = await fetch(listUrl, {
    method: "GET",
    headers: cloudflareHeaders(config.cloudflareApiToken),
  });

  const listJson = (await listRes.json()) as CloudflareListResponse;
  if (!listRes.ok || !listJson.success) {
    const message =
      listJson.errors?.map((entry) => entry.message).join("; ") ??
      `Cloudflare list failed (${listRes.status})`;
    return { ok: false, error: `Cloudflare: ${message}` };
  }

  const existing = listJson.result.find(
    (record) =>
      record.type === "CNAME" &&
      record.content.replace(/\.$/, "") ===
        config.vercelCnameTarget.replace(/\.$/, ""),
  );

  if (existing) {
    return { ok: true, created: false };
  }

  const createRes = await fetch(
    `${CLOUDFLARE_API}/zones/${config.cloudflareZoneId}/dns_records`,
    {
      method: "POST",
      headers: cloudflareHeaders(config.cloudflareApiToken),
      body: JSON.stringify({
        type: "CNAME",
        name: slug,
        content: config.vercelCnameTarget,
        proxied: config.cloudflareDnsProxied,
        ttl: 1,
      }),
    },
  );

  const createJson = (await createRes.json()) as CloudflareCreateResponse;
  if (!createRes.ok || !createJson.success) {
    const message =
      createJson.errors?.map((entry) => entry.message).join("; ") ??
      `Cloudflare create failed (${createRes.status})`;
    return { ok: false, error: `Cloudflare: ${message}` };
  }

  return { ok: true, created: true };
}

export async function removeCloudflareStoreCname(
  config: DomainProvisioningConfig,
  slug: string,
): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const fqdn = recordFqdn(slug, config.apexHost);
  const listUrl = new URL(
    `${CLOUDFLARE_API}/zones/${config.cloudflareZoneId}/dns_records`,
  );
  listUrl.searchParams.set("type", "CNAME");
  listUrl.searchParams.set("name", fqdn);

  const listRes = await fetch(listUrl, {
    method: "GET",
    headers: cloudflareHeaders(config.cloudflareApiToken),
  });

  const listJson = (await listRes.json()) as CloudflareListResponse;
  if (!listRes.ok || !listJson.success) {
    const message =
      listJson.errors?.map((entry) => entry.message).join("; ") ??
      `Cloudflare list failed (${listRes.status})`;
    return { ok: false, error: `Cloudflare: ${message}` };
  }

  if (listJson.result.length === 0) {
    return { ok: true, removed: false };
  }

  for (const record of listJson.result) {
    const deleteRes = await fetch(
      `${CLOUDFLARE_API}/zones/${config.cloudflareZoneId}/dns_records/${record.id}`,
      {
        method: "DELETE",
        headers: cloudflareHeaders(config.cloudflareApiToken),
      },
    );

    if (!deleteRes.ok) {
      return {
        ok: false,
        error: `Cloudflare delete failed (${deleteRes.status})`,
      };
    }
  }

  return { ok: true, removed: true };
}
