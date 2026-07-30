"use server";

import { withTimeoutFallback } from "@/lib/async/with-timeout-fallback";
import {
  getPublicCatalogPageData,
  type PublicCatalogPageData,
} from "@/lib/catalog/get-public-catalog-page-data";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCustomerCheckoutContext } from "@/lib/customers/get-customer-checkout-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { recordCatalogVisit } from "@/lib/analytics/track-catalog-visit";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { getPublicStoreBySlug } from "@/lib/stores";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { getStoreCatalogManifestAbsoluteUrl } from "@/lib/pwa/catalog-sw-paths";
import { getSiteUrl } from "@/lib/site-url";
import { getOpenAiApiKey } from "@/lib/env/server";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { getStorefrontSupportBranding } from "@/lib/catalog/get-storefront-support-branding";
import { resolveStorefrontAssistantAvatar } from "@/lib/catalog/resolve-storefront-assistant-avatar";
import type { CatalogPromotionContext } from "@/lib/promotions/types";
import type { PublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import type { Store } from "@/lib/database.types";
import type { LocationHoursSettings } from "@/lib/store-settings/types";
import type { CustomerAccountMode } from "@/lib/store-settings/types";

const BOOTSTRAP_TIMEOUT_MS = 12_000;
const LAYOUT_TIMEOUT_MS = 8_000;

export type PublicCatalogBootstrapResult =
  | { ok: true; data: PublicCatalogPageData }
  | { ok: false; code: "not_found" | "error"; error: string };

/** Datos del catálogo público; solo desde el cliente (useEffect). */
export async function fetchPublicCatalogPageBootstrap(
  storeSlug: string,
): Promise<PublicCatalogBootstrapResult> {
  const slug = storeSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, code: "not_found", error: "Catálogo no encontrado." };
  }

  try {
    const data = await withTimeoutFallback(
      getPublicCatalogPageData(slug),
      BOOTSTRAP_TIMEOUT_MS,
      null,
      "fetchPublicCatalogPageBootstrap",
    );

    if (!data) {
      return {
        ok: false,
        code: "not_found",
        error: "Catálogo no encontrado.",
      };
    }

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      code: "error",
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo.",
    };
  }
}

export type PublicCatalogLayoutBootstrap =
  | {
      ok: true;
      store: Store;
      storeId: string | null;
      userId: string | null;
      isCustomer: boolean;
      displayName: string | null;
      phone: string | null;
      contactEmail: string | null;
      promotionContext: CatalogPromotionContext;
      themeContext: PublicCatalogThemeContext | null;
      manifestAbsoluteUrl: string;
      storeLogoUrl: string | null;
      assistantEnabled: boolean;
      wholesaleEnabled: boolean;
      whatsappPhone: string | null;
      locationHours: LocationHoursSettings | null;
      supportAvatarUrl: string | null;
      supportAvatarAnimation: ReturnType<
        typeof resolveStorefrontAssistantAvatar
      >["animation"];
      supportAvatarAnimated: boolean;
      supportMerchantName: string | null;
      customerAccountMode: CustomerAccountMode;
    }
  | { ok: false; error: string };

/** Chrome del layout `/c/[slug]`; se carga en el cliente. */
export async function fetchPublicCatalogLayoutBootstrap(
  storeSlug: string,
): Promise<PublicCatalogLayoutBootstrap> {
  const slug = storeSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, error: "Catálogo no encontrado." };
  }

  try {
    const [cartAuth, customerSession, store, origin] = await Promise.all([
      withTimeoutFallback(
        getCartAuthContext(slug),
        LAYOUT_TIMEOUT_MS,
        { userId: null, storeId: null, isCustomer: false },
        "layout:cartAuth",
      ),
      withTimeoutFallback(
        getCustomerCheckoutContext(slug),
        LAYOUT_TIMEOUT_MS,
        {
          isAuthenticated: false,
          isCustomer: false,
          userId: null,
          displayName: null,
          phone: null,
          contactEmail: null,
          deliveryAddress: null,
          preferredShippingMethod: null,
          preferredShippingBranchCode: null,
          preferredShippingBranchName: null,
          preferredShippingBranchAddress: null,
        },
        "layout:customerSession",
      ),
      withTimeoutFallback(
        getPublicStoreBySlug(slug),
        LAYOUT_TIMEOUT_MS,
        null,
        "layout:store",
      ),
      withTimeoutFallback(getRequestOrigin(), LAYOUT_TIMEOUT_MS, getSiteUrl(), "layout:origin"),
    ]);

    if (!store) {
      return { ok: false, error: "Catálogo no encontrado." };
    }

    if (cartAuth.storeId) {
      void recordCatalogVisit(slug, cartAuth.storeId, cartAuth.userId);
    }

    const [promotionContext, themeContext, storeSettings, supportBranding] =
      await Promise.all([
        withTimeoutFallback(
          getCatalogPromotionContext(slug, customerSession.isCustomer),
          LAYOUT_TIMEOUT_MS,
          { guestBanner: null, autoApply: null },
          "layout:promotions",
        ),
        withTimeoutFallback(
          getPublicCatalogThemeContext(slug),
          LAYOUT_TIMEOUT_MS,
          null,
          "layout:theme",
        ),
        cartAuth.storeId
          ? withTimeoutFallback(
              getPublicStoreSettingsConfig(cartAuth.storeId),
              LAYOUT_TIMEOUT_MS,
              null,
              "layout:settings",
            )
          : Promise.resolve(null),
        withTimeoutFallback(
          getStorefrontSupportBranding(store),
          LAYOUT_TIMEOUT_MS,
          null,
          "layout:support",
        ),
      ]);

    const storeLogoUrl =
      store.pwa_icon_192_url ?? store.pwa_icon_512_url ?? store.logo_url ?? null;
    const storeLogoFallback = supportBranding?.avatarUrl ?? storeLogoUrl;
    const assistantAvatar = resolveStorefrontAssistantAvatar(
      storeSettings?.catalogDesign.assistantAvatar,
      storeLogoFallback,
    );

    return {
      ok: true,
      store,
      storeId: cartAuth.storeId,
      userId: cartAuth.userId,
      isCustomer: customerSession.isCustomer,
      displayName: customerSession.displayName,
      phone: customerSession.phone,
      contactEmail: customerSession.contactEmail,
      promotionContext,
      themeContext,
      manifestAbsoluteUrl: getStoreCatalogManifestAbsoluteUrl(slug, origin),
      storeLogoUrl,
      assistantEnabled: Boolean(getOpenAiApiKey()),
      wholesaleEnabled: storeSettings?.catalogCurrency.wholesaleEnabled ?? false,
      whatsappPhone: storeSettings?.contact.whatsappPhone?.trim() || null,
      locationHours: storeSettings?.locationHours ?? null,
      supportAvatarUrl: assistantAvatar.url,
      supportAvatarAnimation: assistantAvatar.animation,
      supportAvatarAnimated: assistantAvatar.animated,
      supportMerchantName: supportBranding?.merchantName ?? null,
      customerAccountMode:
        storeSettings?.checkout?.accountMode === "libre" ? "libre" : "hibrido",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar la tienda.",
    };
  }
}
