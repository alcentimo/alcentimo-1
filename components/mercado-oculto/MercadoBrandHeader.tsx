"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { StoreBrandMark } from "@/components/catalog/StoreBrandMark";
import { cn } from "@/lib/cn";

export interface MercadoBrandHeaderProps {
  brandHref: string;
  brandTitle: string;
  brandKicker?: string;
  /** Inicial o marca corta cuando no hay logo. */
  brandMarkText?: string;
  logoUrl?: string | null;
  nav?: ReactNode;
  /** Buscador central (vitrina marketplace). */
  search?: ReactNode;
  className?: string;
}

/**
 * Cabecera compacta de vitrina Moriche (compartida por Mercado Oculto y tiendas públicas).
 * Sticky nativa: sin listeners de scroll ni re-renders al desplazar.
 */
export function MercadoBrandHeader({
  brandHref,
  brandTitle,
  brandKicker = "Curaduría mayorista",
  brandMarkText = "M",
  logoUrl = null,
  nav,
  search = null,
  className,
}: MercadoBrandHeaderProps) {
  return (
    <header className={cn("mercado-mp-header", className)}>
      <div
        className={cn(
          "mercado-mp-header-top",
          search ? "mercado-mp-header-top--search" : undefined,
        )}
      >
        <Link
          href={brandHref}
          className="mercado-mp-brand"
          prefetch
          aria-label={brandTitle}
        >
          <StoreBrandMark
            logoUrl={logoUrl}
            storeName={brandTitle.trim() || brandMarkText || "T"}
            className="mercado-brand-mark"
            logoClassName="mercado-brand-mark--logo"
            imageClassName="mercado-brand-mark-img"
          />
          <span className="mercado-mp-brand-text">
            {brandKicker ? (
              <span className="mercado-mp-brand-kicker">{brandKicker}</span>
            ) : null}
            <span className="mercado-title">{brandTitle}</span>
          </span>
        </Link>

        {search}

        {nav ? (
          <nav className="mercado-mp-nav" aria-label="Navegación de tienda">
            {nav}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
