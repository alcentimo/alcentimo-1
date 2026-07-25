"use client";

import type { ReactNode } from "react";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CatalogChatWidget } from "@/components/catalog-transactional/CatalogChatWidget";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { InstallPwaBanner } from "@/components/catalog-transactional/InstallPwaBanner";
import { PwaServiceWorkerRegister } from "@/components/catalog-transactional/PwaServiceWorkerRegister";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";

interface CatalogAppShellProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
  supportAvatarUrl?: string | null;
  supportMerchantName?: string | null;
  storeRubro?: string | null;
  enablePcBuilder?: boolean;
  assistantEnabled?: boolean;
  whatsappPhone?: string | null;
  children: ReactNode;
}

export function CatalogAppShell({
  storeSlug,
  storeName,
  storeLogoUrl,
  supportAvatarUrl = null,
  supportMerchantName = null,
  storeRubro = null,
  enablePcBuilder = false,
  assistantEnabled = false,
  whatsappPhone = null,
  children,
}: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();
  const pcBuilderEnabled = storeHasPCBuilder(storeRubro, enablePcBuilder);

  return (
    <>
      <PwaServiceWorkerRegister storeSlug={storeSlug} />
      <InstallPwaBanner
        storeSlug={storeSlug}
        storeName={storeName}
        storeLogoUrl={storeLogoUrl}
      />
      <CustomerPromoBanner promotion={guestBanner} />
      <div className="catalog-shell-content">{children}</div>
      {assistantEnabled ? (
        <CatalogChatWidget
          storeSlug={storeSlug}
          storeName={storeName}
          avatarUrl={supportAvatarUrl}
          merchantName={supportMerchantName}
          whatsappPhone={whatsappPhone}
        />
      ) : null}
      <CatalogTabBar storeSlug={storeSlug} pcBuilderEnabled={pcBuilderEnabled} />
    </>
  );
}
