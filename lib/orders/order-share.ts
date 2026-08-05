import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreCatalogOrigin } from "@/lib/store-host";
import type { StoreCustomDomainInfo } from "@/lib/domains/custom-domain";

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

/** Datos públicos mínimos para la tarjeta OG / página de compartir pedido. */
export async function getOrderShareContext(
  orderId: string,
): Promise<OrderShareContext | null> {
  const normalizedId = orderId.trim();
  if (!normalizedId) return null;

  try {
    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, store_id")
      .eq("id", normalizedId)
      .maybeSingle();

    if (orderError || !order?.store_id) return null;

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select(
        "id, name, slug, logo_url, pwa_icon_192_url, pwa_icon_512_url, custom_domain, custom_domain_verified, is_active",
      )
      .eq("id", order.store_id as string)
      .maybeSingle();

    if (storeError || !store?.id || !store.is_active) return null;

    const images = pickStoreImage(store);

    return {
      orderId: order.id as string,
      shortRef: String(order.id).slice(0, 8).toUpperCase(),
      store: {
        id: store.id as string,
        name: String(store.name ?? "Tienda").trim() || "Tienda",
        slug: String(store.slug ?? "").trim().toLowerCase(),
        logoUrl: images.logoUrl,
        iconUrl: images.iconUrl,
        customDomain: (store.custom_domain as string | null) ?? null,
        customDomainVerified: Boolean(store.custom_domain_verified),
      },
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

/** URL pública del pedido en el origen de la tienda (dominio propio o subdominio). */
export function buildOrderSharePublicUrl(
  storeSlug: string,
  orderId: string,
  domainInfo?: StoreCustomDomainInfo | null,
): string {
  const origin = getStoreCatalogOrigin(storeSlug, domainInfo);
  return `${origin.replace(/\/$/, "")}/o/${orderId.trim()}`;
}

export function resolveOrderShareImageUrl(
  store: Pick<OrderShareStoreBranding, "logoUrl" | "iconUrl">,
  pageOrigin: string,
  orderId: string,
): string {
  return (
    store.logoUrl ??
    store.iconUrl ??
    `${pageOrigin.replace(/\/$/, "")}/o/${orderId.trim()}/opengraph-image`
  );
}
