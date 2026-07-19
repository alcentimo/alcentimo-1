export interface DomainProvisioningConfig {
  apexHost: string;
  vercelCnameTarget: string;
  cloudflareZoneId: string;
  cloudflareApiToken: string;
  vercelApiToken: string;
  vercelProjectId: string;
  vercelTeamId?: string;
  cloudflareDnsProxied: boolean;
}

function optionalEnv(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value || undefined;
}

function resolveApexHost(): string {
  const explicit = optionalEnv("STORE_SUBDOMAIN_APEX_HOST");
  if (explicit) return explicit.replace(/^www\./, "");

  const siteUrl = optionalEnv("SITE_URL") ?? optionalEnv("NEXT_PUBLIC_SITE_URL");
  if (siteUrl) {
    try {
      return new URL(siteUrl).hostname.replace(/^www\./, "");
    } catch {
      // fall through
    }
  }

  return "alcentimo.com";
}

async function resolveCloudflareZoneId(
  apexHost: string,
  apiToken: string,
): Promise<string | null> {
  const url = new URL("https://api.cloudflare.com/client/v4/zones");
  url.searchParams.set("name", apexHost);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.result?.[0]?.id) {
    console.warn(
      JSON.stringify({
        scope: "store-subdomain-provision",
        event: "cloudflare_zone_lookup_failed",
        apexHost,
        status: response.status,
        errors: json.errors ?? null,
      }),
    );
    return null;
  }

  return json.result[0].id as string;
}

export function isStoreSubdomainProvisioningEnabled(): boolean {
  return Deno.env.get("STORE_SUBDOMAIN_PROVISION_ENABLED") === "true";
}

export async function getDomainProvisioningConfig():
  Promise<DomainProvisioningConfig | null> {
  if (!isStoreSubdomainProvisioningEnabled()) {
    return null;
  }

  const apexHost = resolveApexHost();
  const cloudflareApiToken = optionalEnv("CLOUDFLARE_API_TOKEN");
  const vercelApiToken = optionalEnv("VERCEL_API_TOKEN");
  const vercelProjectId = optionalEnv("VERCEL_PROJECT_ID");

  let cloudflareZoneId = optionalEnv("CLOUDFLARE_ZONE_ID");
  if (cloudflareApiToken) {
    const resolvedZoneId = await resolveCloudflareZoneId(
      apexHost,
      cloudflareApiToken,
    );
    if (resolvedZoneId) {
      cloudflareZoneId = resolvedZoneId;
    }
  }

  if (
    !cloudflareZoneId ||
    !cloudflareApiToken ||
    !vercelApiToken ||
    !vercelProjectId
  ) {
    return null;
  }

  return {
    apexHost,
    vercelCnameTarget:
      optionalEnv("VERCEL_DNS_CNAME_TARGET") ?? "cname.vercel-dns.com",
    cloudflareZoneId,
    cloudflareApiToken,
    vercelApiToken,
    vercelProjectId,
    vercelTeamId: optionalEnv("VERCEL_TEAM_ID"),
    cloudflareDnsProxied: optionalEnv("CLOUDFLARE_DNS_PROXIED") === "true",
  };
}
