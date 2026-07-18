"use client";

import type { ReactNode } from "react";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { InstallPwaBanner } from "@/components/catalog-transactional/InstallPwaBanner";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";

interface CatalogAppShellProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
  children: ReactNode;
}

export function CatalogAppShell({
  storeSlug,
  storeName,
  storeLogoUrl,
  children,
}: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();

  return (
    <>
      <InstallPwaBanner
        storeSlug={storeSlug}
        storeName={storeName}
        storeLogoUrl={storeLogoUrl}
      />
      <CustomerPromoBanner promotion={guestBanner} />
      <div className="catalog-shell-content">{children}</div>
      <CatalogTabBar storeSlug={storeSlug} />
    </>
  );
}
