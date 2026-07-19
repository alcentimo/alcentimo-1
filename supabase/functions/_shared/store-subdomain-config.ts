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

export function isStoreSubdomainProvisioningEnabled(): boolean {
  return Deno.env.get("STORE_SUBDOMAIN_PROVISION_ENABLED") === "true";
}

export function getDomainProvisioningConfig():
  | DomainProvisioningConfig
  | null {
  if (!isStoreSubdomainProvisioningEnabled()) {
    return null;
  }

  const cloudflareZoneId = optionalEnv("CLOUDFLARE_ZONE_ID");
  const cloudflareApiToken = optionalEnv("CLOUDFLARE_API_TOKEN");
  const vercelApiToken = optionalEnv("VERCEL_API_TOKEN");
  const vercelProjectId = optionalEnv("VERCEL_PROJECT_ID");

  if (
    !cloudflareZoneId ||
    !cloudflareApiToken ||
    !vercelApiToken ||
    !vercelProjectId
  ) {
    return null;
  }

  return {
    apexHost: resolveApexHost(),
    vercelCnameTarget:
      optionalEnv("VERCEL_DNS_CNAME_TARGET") ?? "cname.vercel-dns.com",
    cloudflareZoneId,
    cloudflareApiToken,
    vercelApiToken,
    vercelProjectId,
    vercelTeamId: optionalEnv("VERCEL_TEAM_ID"),
    cloudflareDnsProxied: optionalEnv("CLOUDFLARE_DNS_PROXIED") !== "false",
  };
}
