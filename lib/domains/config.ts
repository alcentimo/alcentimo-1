/**
 * Configuración para aprovisionamiento de subdominios de tienda.
 * Solo servidor — nunca importar desde componentes cliente.
 */

import { getApexSiteHost } from "@/lib/site-url";

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export interface DomainProvisioningConfig {
  apexHost: string;
  vercelCnameTarget: string;
  cloudflareZoneId: string;
  cloudflareApiToken: string;
  vercelApiToken: string;
  vercelProjectId: string;
  vercelTeamId?: string;
}

/** Activa llamadas a Cloudflare/Vercel al crear o renombrar tiendas. */
export function isStoreSubdomainProvisioningEnabled(): boolean {
  return process.env.STORE_SUBDOMAIN_PROVISION_ENABLED === "true";
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
    apexHost: getApexSiteHost(),
    vercelCnameTarget:
      optionalEnv("VERCEL_DNS_CNAME_TARGET") ?? "cname.vercel-dns.com",
    cloudflareZoneId,
    cloudflareApiToken,
    vercelApiToken,
    vercelProjectId,
    vercelTeamId: optionalEnv("VERCEL_TEAM_ID"),
  };
}
