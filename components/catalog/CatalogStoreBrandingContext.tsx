"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface CatalogStoreBranding {
  logoUrl: string | null;
  storeName: string;
}

const CatalogStoreBrandingContext =
  createContext<CatalogStoreBranding | null>(null);

export function CatalogStoreBrandingProvider({
  logoUrl,
  storeName,
  children,
}: CatalogStoreBranding & { children: ReactNode }) {
  return (
    <CatalogStoreBrandingContext.Provider value={{ logoUrl, storeName }}>
      {children}
    </CatalogStoreBrandingContext.Provider>
  );
}

export function useCatalogStoreBranding(): CatalogStoreBranding | null {
  return useContext(CatalogStoreBrandingContext);
}

export function getCatalogStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}
