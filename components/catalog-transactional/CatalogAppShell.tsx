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
  storeRubro?: string | null;
  assistantEnabled?: boolean;
  children: ReactNode;
}

export function CatalogAppShell({
  storeSlug,
  storeName,
  storeLogoUrl,
  storeRubro = null,
  assistantEnabled = false,
  children,
}: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();
  const pcBuilderEnabled = storeHasPCBuilder(storeRubro);

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
        <CatalogChatWidget storeSlug={storeSlug} storeName={storeName} />
      ) : null}
      <CatalogTabBar storeSlug={storeSlug} pcBuilderEnabled={pcBuilderEnabled} />
    </>
  );
}
