import { getApexSiteHost } from "@/lib/site-url";

export interface StoreCustomDomainInfo {
  customDomain: string | null;
  customDomainVerified: boolean;
}

const DOMAIN_LABEL =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Normaliza un dominio ingresado por el usuario (sin protocolo ni rutas). */
export function normalizeCustomDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? value;
  value = value.split(":")[0] ?? value;
  value = value.replace(/\.$/, "");

  if (!value || value.includes(" ") || value.includes("_")) {
    return null;
  }

  const labels = value.split(".").filter(Boolean);
  if (labels.length < 2) return null;

  for (const label of labels) {
    if (!DOMAIN_LABEL.test(label)) return null;
  }

  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || /\d/.test(tld)) return null;

  return value;
}

export function validateCustomDomainInput(
  input: string,
  options?: { currentStoreId?: string; occupiedByStoreId?: string | null },
): { domain?: string | null; error?: string } {
  const domain = normalizeCustomDomain(input);

  if (!domain) {
    if (!input.trim()) {
      return { domain: null };
    }
    return { error: "Ingresa un dominio válido (ej. tienda.tudominio.com)." };
  }

  const apexHost = getApexSiteHost();
  if (domain === apexHost || domain === `www.${apexHost}`) {
    return { error: "No puedes usar el dominio principal de la plataforma." };
  }

  if (domain.endsWith(`.${apexHost}`)) {
    return {
      error:
        "Usa el enlace gratuito de Alcentimo o configura un dominio propio externo.",
    };
  }

  if (
    options?.occupiedByStoreId &&
    options.currentStoreId &&
    options.occupiedByStoreId !== options.currentStoreId
  ) {
    return { error: "Ese dominio ya está asociado a otra tienda." };
  }

  if (options?.occupiedByStoreId && !options.currentStoreId) {
    return { error: "Ese dominio ya está asociado a otra tienda." };
  }

  return { domain };
}

/** Destino CNAME recomendado para apuntar dominios externos (www / subdominio). */
export function getCustomDomainCnameTarget(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  // Por defecto: apex de la plataforma (alcentimo.com).
  return getApexSiteHost();
}

/** IP para registro A en dominio raíz (@). Por defecto: IP de Vercel. */
export function getCustomDomainApexATarget(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_A_TARGET?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, "").split("/")[0] ?? "76.76.21.21";
  }
  return "76.76.21.21";
}

/**
 * Despliegues efímeros (preview/dev de Vercel): no son dominios de tienda.
 * Evita el 404 "Tienda no encontrada" en URLs *.vercel.app.
 */
export function isEphemeralDeploymentHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host) return false;
  return host === "vercel.app" || host.endsWith(".vercel.app");
}

export function isPlatformCatalogHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host) return true;

  // Preview/dev de Vercel: servir landing/app, no buscar tienda por host.
  if (isEphemeralDeploymentHost(host)) return true;
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "development"
  ) {
    return true;
  }

  const apexHost = getApexSiteHost();
  if (host === apexHost || host === `www.${apexHost}`) return true;
  if (host.endsWith(`.${apexHost}`)) return true;
  if (host.endsWith(".localhost")) return true;

  return false;
}

export function getCustomDomainDnsHostLabel(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  if (parts.length <= 2) return "@";
  return parts.slice(0, -2).join(".");
}

export function isApexCustomDomain(domain: string): boolean {
  return domain.split(".").filter(Boolean).length === 2;
}

export function buildVerifiedCustomDomainOrigin(domain: string): string {
  return `https://${domain}`;
}

export function resolveStorePublicCatalogOrigin(
  storeSlug: string,
  domainInfo?: StoreCustomDomainInfo | null,
  fallbackOrigin?: string,
): string {
  if (
    domainInfo?.customDomain &&
    domainInfo.customDomainVerified
  ) {
    return buildVerifiedCustomDomainOrigin(domainInfo.customDomain);
  }

  if (fallbackOrigin) return fallbackOrigin;
  return `https://${storeSlug.trim().toLowerCase()}.${getApexSiteHost()}`;
}
