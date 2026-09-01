"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface GiftCardStorefrontValue {
  enabled: boolean;
  storeCreditUsd: number;
  setStoreCreditUsd: (value: number) => void;
}

const GiftCardStorefrontContext = createContext<GiftCardStorefrontValue>({
  enabled: false,
  storeCreditUsd: 0,
  setStoreCreditUsd: () => undefined,
});

export function GiftCardStorefrontProvider({
  enabled,
  initialStoreCreditUsd = 0,
  children,
}: {
  enabled: boolean;
  initialStoreCreditUsd?: number;
  children: ReactNode;
}) {
  const [storeCreditUsd, setStoreCreditUsdState] = useState(
    enabled ? initialStoreCreditUsd : 0,
  );

  const setStoreCreditUsd = useCallback((value: number) => {
    setStoreCreditUsdState(Math.max(0, value));
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      storeCreditUsd: enabled ? storeCreditUsd : 0,
      setStoreCreditUsd,
    }),
    [enabled, storeCreditUsd, setStoreCreditUsd],
  );

  return (
    <GiftCardStorefrontContext.Provider value={value}>
      {children}
    </GiftCardStorefrontContext.Provider>
  );
}

export function useGiftCardsEnabled(): boolean {
  return useContext(GiftCardStorefrontContext).enabled;
}

export function useGiftCardStorefront(): GiftCardStorefrontValue {
  return useContext(GiftCardStorefrontContext);
}
