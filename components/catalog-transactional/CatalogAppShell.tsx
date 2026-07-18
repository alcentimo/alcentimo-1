"use client";

import type { ReactNode } from "react";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";

interface CatalogAppShellProps {
  storeSlug: string;
  children: ReactNode;
}

export function CatalogAppShell({ storeSlug, children }: CatalogAppShellProps) {
  const { guestBanner } = usePromotionContext();

  return (
    <>
      <CustomerPromoBanner promotion={guestBanner} />
      <div className="catalog-shell-content">{children}</div>
      <CatalogTabBar storeSlug={storeSlug} />
    </>
  );
}
