"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CatalogPromotionContext } from "@/lib/promotions/types";

const emptyPromotionContext: CatalogPromotionContext = {
  guestBanner: null,
  autoApply: null,
};

const PromotionContext = createContext<CatalogPromotionContext>(emptyPromotionContext);

export function PromotionProvider({
  value,
  children,
}: {
  value: CatalogPromotionContext;
  children: ReactNode;
}) {
  return (
    <PromotionContext.Provider value={value}>{children}</PromotionContext.Provider>
  );
}

export function usePromotionContext(): CatalogPromotionContext {
  return useContext(PromotionContext);
}
