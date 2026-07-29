"use client";

import { CatalogStoreBrandingProvider } from "@/components/catalog/CatalogStoreBrandingContext";
import type { ReactNode } from "react";
import { CatalogShellNavigationProvider } from "@/components/catalog-transactional/CatalogShellNavigation";
import { CatalogCustomerRegisterSheet } from "@/components/catalog-transactional/CatalogCustomerRegisterSheet";
import { CatalogStoreProfileSheet } from "@/components/catalog-transactional/CatalogStoreProfileSheet";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CatalogChatWidget } from "@/components/catalog-transactional/CatalogChatWidget";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { InstallPwaBanner } from "@/components/catalog-transactional/InstallPwaBanner";
import { PwaServiceWorkerRegister } from "@/components/catalog-transactional/PwaServiceWorkerRegister";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import { CustomerAccountModeProvider } from "@/components/catalog-transactional/CustomerAccountModeContext";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";
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
  customerAccountMode?: CustomerAccountMode;
  children: ReactNode;
}

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
  storeRubro = null,
  enablePcBuilder = false,
  assistantEnabled = false,
  whatsappPhone = null,
  customerAccountMode = "hibrido",
  children,
}: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();
  const pcBuilderEnabled = storeHasPCBuilder(storeRubro, enablePcBuilder);
  const accountsEnabled = customerAccountMode === "hibrido";

  return (
    <CustomerAccountModeProvider accountMode={customerAccountMode}>
      <CatalogShellNavigationProvider storeSlug={storeSlug}>
        <CatalogStoreBrandingProvider logoUrl={storeLogoUrl} storeName={storeName}>
          <PwaServiceWorkerRegister storeSlug={storeSlug} />
          <InstallPwaBanner
            storeSlug={storeSlug}
            storeName={storeName}
            storeLogoUrl={storeLogoUrl}
          />
          {accountsEnabled ? (
            <CustomerPromoBanner promotion={guestBanner} />
          ) : null}
          <div className="catalog-shell-content">{children}</div>
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
          <CatalogStoreProfileSheet
            storeSlug={storeSlug}
            storeName={storeName}
            storeLogoUrl={storeLogoUrl}
            storeDescription={storeDescription}
            whatsappPhone={whatsappPhone}
            locationHours={locationHours}
          />
          {accountsEnabled ? (
            <CatalogCustomerRegisterSheet
              storeSlug={storeSlug}
              storeName={storeName}
            />
          ) : null}
          <CatalogTabBar storeSlug={storeSlug} pcBuilderEnabled={pcBuilderEnabled} />
        </CatalogStoreBrandingProvider>
      </CatalogShellNavigationProvider>
    </CustomerAccountModeProvider>
  );
}
