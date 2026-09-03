"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  useHeaderScrollProgress,
  useHideOnScroll,
  type StoreHeaderScrollMode,
} from "@/lib/hooks/useHideOnScroll";

export interface MercadoBrandHeaderProps {
  brandHref: string;
  brandTitle: string;
  brandKicker?: string;
  brandMarkText?: string;
  logoUrl?: string | null;
  nav?: ReactNode;
  search?: ReactNode;
  className?: string;
  hideOnScroll?: boolean;
  scrollMode?: StoreHeaderScrollMode;
}

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
  scrollMode = "hide-on-down",
}: MercadoBrandHeaderProps) {
  const fadeWithScroll = scrollMode === "fade-with-scroll";
  const scrollHidden = useHideOnScroll(hideOnScroll && !fadeWithScroll, {
    mode: scrollMode === "reveal-on-down" ? "reveal-on-down" : "hide-on-down",
  });
  const fadeProgress = useHeaderScrollProgress(hideOnScroll && fadeWithScroll);

  const fadeStyle: CSSProperties | undefined = fadeWithScroll
    ? {
        opacity: fadeProgress,
        transform: `translate3d(0, ${(1 - fadeProgress) * -10}px, 0)`,
        pointerEvents: fadeProgress < 0.08 ? "none" : "auto",
      }
    : undefined;

  return (
    <header
      className={cn(
        "mercado-mp-header",
        fadeWithScroll && "mercado-mp-header--scroll-fade",
        !fadeWithScroll && scrollHidden && "mercado-mp-header--scroll-hidden",
        className,
      )}
      style={fadeStyle}
      aria-hidden={fadeWithScroll && fadeProgress < 0.08}
      inert={fadeWithScroll && fadeProgress < 0.08 ? true : undefined}
    >
      <div
        className={cn(
          "mercado-mp-header-top",
          search ? "mercado-mp-header-top--search" : undefined,
        )}
      >
        <Link href={brandHref} className="mercado-mp-brand" prefetch>
          {logoUrl ? (
            <span className="mercado-brand-mark mercado-brand-mark--logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="mercado-brand-mark-img" />
            </span>
          ) : (
            <span className="mercado-brand-mark" aria-hidden="true">
              {brandMarkText.slice(0, 2).toUpperCase()}
            </span>
          )}
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
