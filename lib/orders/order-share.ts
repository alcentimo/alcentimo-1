import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreCatalogOrigin, parseStoreSlugFromHost } from "@/lib/store-host";
import {
  normalizeCustomDomain,
  type StoreCustomDomainInfo,
} from "@/lib/domains/custom-domain";

export interface OrderShareStoreBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  iconUrl: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
}

export interface OrderShareContext {
  orderId: string;
  shortRef: string;
  store: OrderShareStoreBranding;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHORT_CODE_RE = /^[0-9a-f]{8}$/i;

function absoluteImageUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return null;
}

function pickStoreImage(store: {
  logo_url?: string | null;
  pwa_icon_512_url?: string | null;
  pwa_icon_192_url?: string | null;
}): { logoUrl: string | null; iconUrl: string | null } {
  const logoUrl = absoluteImageUrl(store.logo_url);
  const iconUrl =
    absoluteImageUrl(store.pwa_icon_512_url) ??
    absoluteImageUrl(store.pwa_icon_192_url) ??
    logoUrl;
  return { logoUrl, iconUrl };
}

/** Código corto de 8 caracteres a partir del UUID del pedido. */
export function formatOrderShareCode(orderId: string): string {
  const cleaned = orderId.trim().replace(/-/g, "");
  return cleaned.slice(0, 8).toUpperCase();
}

function isFullOrderUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function isShortOrderCode(value: string): boolean {
  return SHORT_CODE_RE.test(value.trim().replace(/^#/, ""));
}

function mapStoreBranding(store: Record<string, unknown>): OrderShareStoreBranding {
  const images = pickStoreImage(store);
  return {
    id: store.id as string,
    name: String(store.name ?? "Tienda").trim() || "Tienda",
    slug: String(store.slug ?? "").trim().toLowerCase(),
    logoUrl: images.logoUrl,
    iconUrl: images.iconUrl,
    customDomain: (store.custom_domain as string | null) ?? null,
    customDomainVerified: Boolean(store.custom_domain_verified),
  };
}

async function resolveStoreIdFromHost(
  admin: ReturnType<typeof createAdminClient>,
  host: string | null | undefined,
): Promise<string | null> {
  if (!host?.trim()) return null;

  const slug = parseStoreSlugFromHost(host);
  if (slug) {
    const { data } = await admin
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  }

  const domain = normalizeCustomDomain(host);
  if (!domain) return null;

  const { data } = await admin
    .from("stores")
    .select("id")
    .eq("custom_domain", domain)
    .eq("custom_domain_verified", true)
    .eq("is_active", true)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

async function resolveStoreIdFromSlug(
  admin: ReturnType<typeof createAdminClient>,
  storeSlug: string | null | undefined,
): Promise<string | null> {
  const slug = storeSlug?.trim().toLowerCase();
  if (!slug) return null;
  const { data } = await admin
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function findOrderByShortCode(
  admin: ReturnType<typeof createAdminClient>,
  code: string,
  storeId: string | null,
): Promise<{ id: string; store_id: string } | null> {
  const prefix = code.trim().replace(/^#/, "").toLowerCase();
  if (!SHORT_CODE_RE.test(prefix)) return null;

  // Rango UUID con el mismo prefijo de 8 hex (xxxxxxxx-…).
  const lo = `${prefix}-0000-0000-0000-000000000000`;
  const hi = `${prefix}-ffff-ffff-ffff-ffffffffffff`;

  let query = admin
    .from("orders")
    .select("id, store_id, created_at")
    .gte("id", lo)
    .lte("id", hi)
    .order("created_at", { ascending: false })
    .limit(5);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const match = storeId
    ? data[0]
    : data.length === 1
      ? data[0]
      : data[0];

  if (!match?.id || !match.store_id) return null;
  return { id: match.id as string, store_id: match.store_id as string };
}

/** Datos públicos mínimos para la tarjeta OG / página de compartir pedido. */
export async function getOrderShareContext(
  orderKey: string,
  options?: { storeSlug?: string | null; host?: string | null },
): Promise<OrderShareContext | null> {
  const raw = orderKey.trim().replace(/^#/, "");
  if (!raw) return null;

  try {
    const admin = createAdminClient();

    let orderId: string | null = null;
    let storeId: string | null = null;

    if (isFullOrderUuid(raw)) {
      const { data: order, error } = await admin
        .from("orders")
        .select("id, store_id")
        .eq("id", raw)
        .maybeSingle();
      if (error || !order?.id) return null;
      orderId = order.id as string;
      storeId = order.store_id as string;
    } else if (isShortOrderCode(raw)) {
      const hostStoreId =
        (await resolveStoreIdFromSlug(admin, options?.storeSlug)) ??
        (await resolveStoreIdFromHost(admin, options?.host));
      const found = await findOrderByShortCode(admin, raw, hostStoreId);
      if (!found) return null;
      orderId = found.id;
      storeId = found.store_id;
    } else {
      return null;
    }

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select(
        "id, name, slug, logo_url, pwa_icon_192_url, pwa_icon_512_url, custom_domain, custom_domain_verified, is_active",
      )
      .eq("id", storeId)
      .maybeSingle();

    if (storeError || !store?.id || !store.is_active) return null;

    return {
      orderId,
      shortRef: formatOrderShareCode(orderId),
      store: mapStoreBranding(store as Record<string, unknown>),
    };
  } catch {
    return null;
  }
}

export function getOrderShareDomainInfo(
  store: Pick<OrderShareStoreBranding, "customDomain" | "customDomainVerified">,
): StoreCustomDomainInfo | null {
  if (!store.customDomain?.trim()) return null;
  return {
    customDomain: store.customDomain.trim().toLowerCase(),
    customDomainVerified: store.customDomainVerified,
  };
}

/**
 * URL corta pública del pedido en el origen de la tienda.
 * Ej: https://todoropa.alcentimo.com/o/B67E238D
 */
export function buildOrderSharePublicUrl(
  storeSlug: string,
  orderId: string,
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  const origin = getStoreCatalogOrigin(storeSlug, domainInfo);
  const code = formatOrderShareCode(orderId);
  return `${origin.replace(/\/$/, "")}/o/${code}`;
}

export function resolveOrderShareImageUrl(
  store: Pick<OrderShareStoreBranding, "logoUrl" | "iconUrl">,
  pageOrigin: string,
  shortRef: string,
): string {
  return (
    store.logoUrl ??
    store.iconUrl ??
    `${pageOrigin.replace(/\/$/, "")}/o/${shortRef.trim().toUpperCase()}/opengraph-image`
  );
}
