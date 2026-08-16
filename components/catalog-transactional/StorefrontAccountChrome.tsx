"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { StorefrontMoricheNav } from "@/components/catalog-transactional/StorefrontMoricheNav";
import { buildMercadoBrandCssVars } from "@/lib/mercado-oculto/brand-css-vars";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface StorefrontAccountChromeProps {
  storeSlug: string;
  storeName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Cabecera Moriche sin hero (cuenta, perfil, registro).
 * Mantiene Pedidos / Carrito / Cuenta visibles fuera del catálogo.
 */
export function StorefrontAccountChrome({
  storeSlug,
  storeName,
  logoUrl = null,
  primaryColor = null,
  eyebrow = "Mi cuenta",
  children,
  className,
  style,
}: StorefrontAccountChromeProps) {
  const pathname = usePathname();
  const brandHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const brandVars = buildMercadoBrandCssVars(primaryColor);
  const markText = storeName.trim().slice(0, 1) || "T";

  return (
    <div
      className={cn(
        "mercado-shell storefront-moriche-shell storefront-moriche-shell--account",
        className,
      )}
      style={{ ...brandVars, ...style }}
    >
      <MercadoBrandHeader
        brandHref={brandHref}
        brandTitle={storeName}
        brandKicker={eyebrow}
        brandMarkText={markText}
        logoUrl={logoUrl}
        nav={<StorefrontMoricheNav storeSlug={storeSlug} compact />}
      />
      <main className="mercado-main mercado-mp-main storefront-account-main">
        {children}
      </main>
    </div>
  );
}
