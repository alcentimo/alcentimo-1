import { getApexSiteHost, getSiteUrl } from "@/lib/site-url";
import {
  buildVerifiedCustomDomainOrigin,
  isEphemeralDeploymentHost,
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

  // Preview/dev de Vercel nunca es un subdominio de tienda.
  if (isEphemeralDeploymentHost(hostname)) {
    return null;
  }

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

function isPathBasedCatalogPath(
  storeSlug: string,
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  const base = `/c/${normalizeStoreSlug(storeSlug)}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Ruta base del catálogo: "/" en subdominio o "/c/slug" en apex.
 * Si `pathname` indica que ya estamos en `/c/[slug]`, conserva esa forma
 * aunque el modo subdominio esté activo (evita saltar a "/" del apex).
 */
export function getStoreCatalogBasePath(
  storeSlug: string,
  options?: { pathname?: string | null },
): string {
  const slug = normalizeStoreSlug(storeSlug);
  const pathBased = `/c/${slug}`;

  if (isPathBasedCatalogPath(slug, options?.pathname)) {
    return pathBased;
  }

  if (isStoreSubdomainCatalogEnabled()) {
    return "/";
  }

  return pathBased;
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

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

/**
 * Deep-link de ficha: `/producto/{slug}` en subdominio o
 * `/c/{tienda}/producto/{slug}` en catálogo por ruta.
 */
export function parsePublicCatalogProductPath(pathname: string): {
  storeSlugFromPath: string | null;
  productKey: string;
} | null {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "producto") {
    const productKey = decodePathSegment(parts[1] ?? "");
    return productKey ? { storeSlugFromPath: null, productKey } : null;
  }
  if (
    parts.length === 4 &&
    parts[0] === "c" &&
    parts[2] === "producto"
  ) {
    const storeSlugFromPath = normalizeStoreSlug(parts[1] ?? "");
    const productKey = decodePathSegment(parts[3] ?? "");
    if (!storeSlugFromPath || !productKey) return null;
    return { storeSlugFromPath, productKey };
  }
  return null;
}

/** Ruta relativa de la ficha pública (`/producto/slug-del-producto`). */
export function getStoreProductPublicPath(productSlug: string): string {
  const slug = productSlug.trim().replace(/^\/+|\/+$/g, "");
  return `/producto/${encodeURIComponent(slug)}`;
}

/** URL absoluta de un producto en la tienda pública del dropshipper. */
export function getStoreProductPublicUrl(
  storeSlug: string,
  productSlug: string,
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  return getStoreCatalogPublicUrl(
    storeSlug,
    getStoreProductPublicPath(productSlug),
    domainInfo,
  );
}

export function getStoreCustomerAccountPath(
  storeSlug: string,
  section: "cuenta" | "perfil" = "cuenta",
  options?: { pathname?: string | null },
): string {
  const slug = normalizeStoreSlug(storeSlug);
  const pathBased = `/c/${slug}/${section}`;

  // En catálogo path-based (/c/slug) nunca usar /cuenta|/perfil cortos:
  // en apex eso cae al home y el clic “no hace nada”.
  if (isPathBasedCatalogPath(slug, options?.pathname)) {
    return pathBased;
  }

  if (isStoreSubdomainCatalogEnabled()) {
    return `/${section}`;
  }

  return pathBased;
}

/** Detalle de un pedido en Mis compras (`/cuenta/{orderId}`). */
export function getStoreCustomerOrderPath(
  storeSlug: string,
  orderId: string,
  options?: { pathname?: string | null },
): string {
  const base = getStoreCustomerAccountPath(storeSlug, "cuenta", options);
  return `${base}/${encodeURIComponent(orderId.trim())}`;
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
  "/registro",
  "/manifest.json",
  "/sw.js",
]);

function isSubdomainCatalogPublicPath(pathname: string): boolean {
  if (SUBDOMAIN_CATALOG_PUBLIC_PATHS.has(pathname)) return true;

  return (
    pathname.startsWith("/armar-pc/") ||
    pathname.startsWith("/categorias/") ||
    pathname.startsWith("/cuenta/") ||
    pathname.startsWith("/perfil/") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/producto/")
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
