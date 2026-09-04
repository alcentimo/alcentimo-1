"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getCatalogStoreInitials } from "@/components/catalog/CatalogStoreBrandingContext";
import { cn } from "@/lib/cn";
import { useHideOnScroll } from "@/lib/hooks/useHideOnScroll";

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
  /** Si es false, la cabecera no se oculta al hacer scroll. */
  hideOnScroll?: boolean;
}

function MercadoBrandMark({
  logoUrl,
  brandTitle,
  brandMarkText,
}: {
  logoUrl?: string | null;
  brandTitle: string;
  brandMarkText: string;
}) {
  const [logoReady, setLogoReady] = useState(false);
  const trimmedLogo = logoUrl?.trim() || null;

  useEffect(() => {
    setLogoReady(false);
  }, [trimmedLogo]);

  const initials = getCatalogStoreInitials(
    brandTitle.trim() || brandMarkText || "T",
  );

  return (
    <>
      {trimmedLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmedLogo}
          alt=""
          className="sr-only"
          aria-hidden="true"
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) {
              setLogoReady(true);
            }
          }}
          onError={() => setLogoReady(false)}
        />
      ) : null}
      {trimmedLogo && logoReady ? (
        <span className="mercado-brand-mark mercado-brand-mark--logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trimmedLogo} alt="" className="mercado-brand-mark-img" />
        </span>
      ) : (
        <span className="mercado-brand-mark" aria-hidden="true">
          {initials}
        </span>
      )}
    </>
  );
}

/**
 * Cabecera compacta de vitrina Moriche (compartida por Mercado Oculto y tiendas públicas).
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
  hideOnScroll = true,
}: MercadoBrandHeaderProps) {
  const scrollHidden = useHideOnScroll(hideOnScroll);

  return (
    <header
      className={cn(
        "mercado-mp-header",
        scrollHidden && "mercado-mp-header--scroll-hidden",
        className,
      )}
    >
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
          <MercadoBrandMark
            logoUrl={logoUrl}
            brandTitle={brandTitle}
            brandMarkText={brandMarkText}
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
