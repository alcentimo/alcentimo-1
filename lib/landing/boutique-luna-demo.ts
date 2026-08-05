import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { getReferenceCatalogForStore } from "@/lib/catalog/rubro-preview-products";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { resolveCatalogDesign } from "@/lib/store-settings/catalog-theme";
import { normalizeWhatsAppChatWelcome } from "@/lib/catalog/whatsapp-quick-chat";

/** Slug aislado: carrito en localStorage sin chocar con tiendas reales. */
export const BOUTIQUE_LUNA_DEMO_SLUG = "boutique-luna-demo";

/** UUID estable solo para demos (no existe en BD). */
export const BOUTIQUE_LUNA_DEMO_STORE_ID =
  "00000000-0000-4000-a000-boutique0001";

/** Número de demo para abrir WhatsApp (formato VE). */
export const BOUTIQUE_LUNA_DEMO_WHATSAPP = "584121234567";

const NOW = "2026-01-01T12:00:00.000Z";

/**
 * Tienda ficticia Boutique Luna para el sandbox interactivo de la landing.
 * No persiste en Supabase; solo alimenta el catálogo real en modo demo.
 */
export function createBoutiqueLunaDemoStore(): Store {
  return {
    id: BOUTIQUE_LUNA_DEMO_STORE_ID,
    owner_id: "00000000-0000-4000-a000-boutiqueowner",
    name: "Boutique Luna",
    slug: BOUTIQUE_LUNA_DEMO_SLUG,
    description: "Moda contemporánea para el día a día",
    logo_url: null,
    pwa_icon_192_url: null,
    pwa_icon_512_url: null,
    country: "VE",
    rubro_tienda: "ropa-moda",
    enable_pc_builder: false,
    custom_domain: null,
    custom_domain_verified: false,
    custom_domain_verified_at: null,
    is_active: true,
    catalog_access_mode: "public",
    created_at: NOW,
    updated_at: NOW,
  };
}

export function createBoutiqueLunaDemoSettings(
  exchangeRate: number | null = null,
): CatalogPreviewSettings {
  const config = defaultStoreSettingsConfig();
  config.contact.whatsappPhone = BOUTIQUE_LUNA_DEMO_WHATSAPP;
  config.contact.whatsappPhones = [BOUTIQUE_LUNA_DEMO_WHATSAPP];
  config.contact.whatsappChatWelcome = normalizeWhatsAppChatWelcome(
    "¡Hola! Soy el equipo de Boutique Luna. ¿En qué te ayudamos?",
  );
  config.catalogCurrency = {
    showOfficialRate: true,
    showBsConversion: true,
    wholesaleEnabled: false,
  };
  config.catalogDesign = {
    ...config.catalogDesign,
    theme: "fashion-pure",
    saleMode: "quick",
    layout: "grid",
    visibility: {
      showStock: true,
      showDescription: true,
      showPrices: true,
    },
  };
  config.locationHours = {
    ...config.locationHours,
    address: "Av. Principal, Centro Comercial Luna · Local 12",
    city: "Caracas",
  };

  void exchangeRate;

  return {
    purchaseInfo: buildPublicPurchaseInfo(config),
    catalogDesign: resolveCatalogDesign(config.catalogDesign, "ropa-moda"),
    catalogCurrency: config.catalogCurrency,
  };
}

export function createBoutiqueLunaDemoProducts(
  exchangeRate: number | null = null,
): CatalogListItem[] {
  const store = createBoutiqueLunaDemoStore();
  return getReferenceCatalogForStore(store, exchangeRate, "ropa-moda").products;
}

export function getBoutiqueLunaDemoBundle(exchangeRate: number | null = null) {
  const store = createBoutiqueLunaDemoStore();
  return {
    store,
    products: createBoutiqueLunaDemoProducts(exchangeRate),
    settings: createBoutiqueLunaDemoSettings(exchangeRate),
    whatsappPhone: BOUTIQUE_LUNA_DEMO_WHATSAPP,
  };
}
