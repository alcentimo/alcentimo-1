"use client";

import { CatalogStoreBrandingProvider } from "@/components/catalog/CatalogStoreBrandingContext";
import type { ReactNode } from "react";
import { CatalogShellNavigationProvider } from "@/components/catalog-transactional/CatalogShellNavigation";
import { CatalogCustomerRegisterSheet } from "@/components/catalog-transactional/CatalogCustomerRegisterSheet";
import { CatalogStoreProfileSheet } from "@/components/catalog-transactional/CatalogStoreProfileSheet";
import { CatalogChatWidget } from "@/components/catalog-transactional/CatalogChatWidget";
import { CatalogWhatsAppQuickChat } from "@/components/catalog-transactional/CatalogWhatsAppQuickChat";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { InstallPwaBanner } from "@/components/catalog-transactional/InstallPwaBanner";
import { PwaServiceWorkerRegister } from "@/components/catalog-transactional/PwaServiceWorkerRegister";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import { CustomerAccountModeProvider } from "@/components/catalog-transactional/CustomerAccountModeContext";
import type {
  CustomerAccountMode,
  LocationHoursSettings,
} from "@/lib/store-settings/types";

interface CatalogAppShellProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeDescription?: string | null;
  locationHours?: LocationHoursSettings | null;
  supportAvatarUrl?: string | null;
  supportAvatarAnimation?: import("@/lib/store-settings/assistant-avatar-presets").AssistantAvatarAnimationKind | null;
  supportAvatarAnimated?: boolean;
  supportMerchantName?: string | null;
  storeRubro?: string | null;
  enablePcBuilder?: boolean;
  assistantEnabled?: boolean;
  whatsappPhone?: string | null;
  whatsappChatWelcome?: string | null;
  customerAccountMode?: CustomerAccountMode;
  children: ReactNode;
}

/**
 * Shell del catálogo público: cabecera marketplace + barra inferior en móvil.
 */
export function CatalogAppShell({
  storeSlug,
  storeName,
  storeLogoUrl,
  storeDescription = null,
  locationHours = null,
  supportAvatarUrl = null,
  supportAvatarAnimation = null,
  supportAvatarAnimated = false,
  supportMerchantName = null,
  storeRubro: _storeRubro = null,
  enablePcBuilder = false,
  assistantEnabled = false,
  whatsappPhone = null,
  whatsappChatWelcome = null,
  customerAccountMode: _customerAccountMode = "hibrido",
  children,
}: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();

  return (
    <CustomerAccountModeProvider accountMode="hibrido">
      <CatalogShellNavigationProvider storeSlug={storeSlug}>
        <CatalogStoreBrandingProvider logoUrl={storeLogoUrl} storeName={storeName}>
          <PwaServiceWorkerRegister storeSlug={storeSlug} />
          <InstallPwaBanner
            storeSlug={storeSlug}
            storeName={storeName}
            storeLogoUrl={storeLogoUrl}
          />
          <CustomerPromoBanner promotion={guestBanner} />
          <div className="catalog-shell-content catalog-shell-content--moriche catalog-shell-content--marketplace">
            {children}
          </div>
          <CatalogTabBar
            storeSlug={storeSlug}
            pcBuilderEnabled={enablePcBuilder}
          />
          {assistantEnabled ? (
            <CatalogChatWidget
              storeSlug={storeSlug}
              storeName={storeName}
              avatarUrl={supportAvatarUrl}
              avatarAnimation={supportAvatarAnimation}
              avatarAnimated={supportAvatarAnimated}
              merchantName={supportMerchantName}
              whatsappPhone={whatsappPhone}
            />
          ) : null}
          {whatsappPhone?.trim() ? (
            <CatalogWhatsAppQuickChat
              storeName={storeName}
              whatsappPhone={whatsappPhone}
              welcomeMessage={whatsappChatWelcome}
            />
          ) : null}
          <CatalogStoreProfileSheet
            storeSlug={storeSlug}
            storeName={storeName}
            storeLogoUrl={storeLogoUrl}
            storeDescription={storeDescription}
            whatsappPhone={whatsappPhone}
            locationHours={locationHours}
          />
          <CatalogCustomerRegisterSheet
            storeSlug={storeSlug}
            storeName={storeName}
          />
        </CatalogStoreBrandingProvider>
      </CatalogShellNavigationProvider>
    </CustomerAccountModeProvider>
  );
}
