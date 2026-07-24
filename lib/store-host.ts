import { getApexSiteHost, getSiteUrl } from "@/lib/site-url";
import {
  buildVerifiedCustomDomainOrigin,
  type StoreCustomDomainInfo,
} from "@/lib/domains/custom-domain";

const RESERVED_STORE_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "dashboard",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "dev",
  "staging",
  "test",
  "auth",
  "login",
]);

function normalizeStoreSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Producción usa subdominios; en local se puede forzar con env. */
export function isStoreSubdomainCatalogEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_ENABLED === "true") return true;
  if (process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function parseStoreSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0]?.trim().toLowerCase();
  if (!hostname) return null;

  const apexHost = getApexSiteHost();

  if (hostname === apexHost || hostname === `www.${apexHost}`) {
    return null;
  }

  if (hostname.endsWith(`.${apexHost}`)) {
    const slug = hostname.slice(0, -(apexHost.length + 1));
    if (!slug || slug.includes(".") || RESERVED_STORE_SUBDOMAINS.has(slug)) {
      return null;
    }
    return normalizeStoreSlug(slug);
  }

  if (hostname.endsWith(".localhost")) {
    const slug = hostname.replace(/\.localhost$/, "");
    if (!slug || slug.includes(".") || RESERVED_STORE_SUBDOMAINS.has(slug)) {
      return null;
    }
    return normalizeStoreSlug(slug);
  }

  return null;
}

export function isSubdomainCatalogOrigin(origin: string, storeSlug: string): boolean {
  try {
    const slugFromHost = parseStoreSlugFromHost(new URL(origin).host);
    return slugFromHost === normalizeStoreSlug(storeSlug);
  } catch {
    return false;
  }
}

/** Origen público del catálogo: https://ferremax.alcentimo.com o dominio verificado. */
export function getStoreCatalogOrigin(
  storeSlug: string,
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  if (domainInfo?.customDomain && domainInfo.customDomainVerified) {
    return buildVerifiedCustomDomainOrigin(domainInfo.customDomain);
  }

  const slug = normalizeStoreSlug(storeSlug);

  if (isStoreSubdomainCatalogEnabled()) {
    return `https://${slug}.${getApexSiteHost()}`;
  }

  return getSiteUrl();
}

/** Ruta base del catálogo: "/" en subdominio o "/c/slug" en apex legacy. */
export function getStoreCatalogBasePath(storeSlug: string): string {
  if (isStoreSubdomainCatalogEnabled()) {
    return "/";
  }

  return `/c/${normalizeStoreSlug(storeSlug)}`;
}

function joinPublicPath(basePath: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (basePath === "/") {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return basePath;
  }

  return `${basePath}${normalizedPath}`;
}

/** URL pública absoluta del catálogo (subdominio preferido en producción). */
export function getStoreCatalogPublicUrl(
  storeSlug: string,
  path = "/",
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  const origin = getStoreCatalogOrigin(storeSlug, domainInfo);
  const basePath =
    domainInfo?.customDomain && domainInfo.customDomainVerified
      ? "/"
      : getStoreCatalogBasePath(storeSlug);
  return `${origin}${joinPublicPath(basePath, path)}`;
}

export function getStoreCustomerAccountPath(
  storeSlug: string,
  section: "cuenta" | "perfil" = "cuenta",
): string {
  if (isStoreSubdomainCatalogEnabled()) {
    return `/${section}`;
  }

  return `/c/${normalizeStoreSlug(storeSlug)}/${section}`;
}

export function getStoreCustomerAccountUrl(
  storeSlug: string,
  section: "cuenta" | "perfil" = "cuenta",
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  return `${getStoreCatalogOrigin(storeSlug, domainInfo)}${getStoreCustomerAccountPath(storeSlug, section)}`;
}

/** Convierte ruta pública del catálogo a ruta interna App Router (/c/slug/...). */
export function toInternalCatalogPath(
  pathname: string,
  storeSlugFromHost: string | null,
): string {
  if (!storeSlugFromHost) {
    return pathname;
  }

  if (
    pathname.startsWith("/c/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/")
  ) {
    return pathname;
  }

  return `/c/${storeSlugFromHost}${pathname === "/" ? "" : pathname}`;
}

/** Rutas públicas del catálogo que viven bajo app/c/[store_slug]/ */
const SUBDOMAIN_CATALOG_PUBLIC_PATHS = new Set([
  "/",
  "/armar-pc",
  "/categorias",
  "/cuenta",
  "/perfil",
  "/manifest.json",
  "/sw.js",
]);

function isSubdomainCatalogPublicPath(pathname: string): boolean {
  if (SUBDOMAIN_CATALOG_PUBLIC_PATHS.has(pathname)) return true;

  return (
    pathname.startsWith("/armar-pc/") ||
    pathname.startsWith("/categorias/") ||
    pathname.startsWith("/cuenta/") ||
    pathname.startsWith("/perfil/")
  );
}

/** ¿Debe reescribirse la petición de subdominio hacia /c/[slug]? */
export function shouldRewriteSubdomainCatalogPath(pathname: string): boolean {
  if (
    pathname.startsWith("/c/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/favicon.ico"
  ) {
    return false;
  }

  // Solo reescribir rutas del catálogo. /register, /dashboard, etc. viven en app/.
  return isSubdomainCatalogPublicPath(pathname);
}
