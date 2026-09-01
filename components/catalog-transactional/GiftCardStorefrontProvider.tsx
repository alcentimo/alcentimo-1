"use client";

import { createContext, useContext, type ReactNode } from "react";

const GiftCardStorefrontContext = createContext(false);

export function GiftCardStorefrontProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <GiftCardStorefrontContext.Provider value={enabled}>
      {children}
    </GiftCardStorefrontContext.Provider>
  );
}

export function useGiftCardsEnabled(): boolean {
  return useContext(GiftCardStorefrontContext);
}
