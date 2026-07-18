"use client";

import type { ReactNode } from "react";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";

interface CatalogAppShellProps {
  storeSlug: string;
  children: ReactNode;
}

export function CatalogAppShell({ storeSlug, children }: CatalogAppShellProps) {
  return (
    <>
      <div className="catalog-shell-content">{children}</div>
      <CatalogTabBar storeSlug={storeSlug} />
    </>
  );
}
