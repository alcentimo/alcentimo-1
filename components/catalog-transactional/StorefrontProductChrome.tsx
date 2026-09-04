"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { StorefrontMoricheChrome } from "@/components/catalog-transactional/StorefrontMoricheChrome";
import {
  resolveAutomaticStorefrontCategories,
  type CatalogCategoryOption,
} from "@/lib/catalog/extract-categories";
import type { CatalogListItem, Store } from "@/lib/database.types";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { resolveStoreLogoUrl } from "@/lib/stores/logo-url";
import { cn } from "@/lib/cn";

interface StorefrontProductChromeProps {
  store: Store;
  products?: CatalogListItem[];
  storeCategories?: CatalogCategoryOption[];
  primaryColor?: string | null;
  eyebrow?: string;
  className?: string;
  children: ReactNode;
}

function joinCatalogPath(basePath: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (basePath === "/") return normalizedPath;
  if (normalizedPath === "/") return basePath;
  return `${basePath}${normalizedPath}`;
}

/**
 * Cabecera global de tienda (logo, buscador, categorías) alrededor de la ficha.
 * En desktop replica la página principal: el panel queda debajo del menú.
 */
export function StorefrontProductChrome({
  store,
  products = [],
  storeCategories = [],
  primaryColor = null,
  eyebrow = "Catálogo",
  className,
  children,
}: StorefrontProductChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const catalogHref = getStoreCatalogBasePath(store.slug, { pathname });
  const categoriesHref = joinCatalogPath(catalogHref, "/categorias");

  const categories = useMemo(
    () => resolveAutomaticStorefrontCategories(storeCategories, products),
    [storeCategories, products],
  );

  const goToCatalogSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      router.push(catalogHref);
      return;
    }
    const params = new URLSearchParams();
    params.set("q", q);
    router.push(`${catalogHref}?${params.toString()}`);
  }, [catalogHref, router, searchQuery]);

  const onSelectCategory = useCallback(
    (id: string | null) => {
      if (!id) {
        router.push(catalogHref);
        return;
      }
      const params = new URLSearchParams();
      params.set("categoria", id);
      router.push(`${categoriesHref}?${params.toString()}`);
    },
    [catalogHref, categoriesHref, router],
  );

  return (
    <StorefrontMoricheChrome
      storeSlug={store.slug}
      storeName={store.name}
      logoUrl={resolveStoreLogoUrl(store)}
      primaryColor={primaryColor}
      eyebrow={eyebrow}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onSearchSubmit={goToCatalogSearch}
      categories={categories}
      activeCategoryId={null}
      onSelectCategory={onSelectCategory}
      pinNavigation
      className={cn("storefront-product-chrome", className)}
    >
      {children}
    </StorefrontMoricheChrome>
  );
}
