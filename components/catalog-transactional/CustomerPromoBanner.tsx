"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import type { CatalogPromotionContext } from "@/lib/promotions/types";

interface CustomerPromoBannerProps {
  promotion: CatalogPromotionContext["guestBanner"];
}

export function CustomerPromoBanner({ promotion }: CustomerPromoBannerProps) {
  const shellNav = useCatalogShellNavigationOptional();

  if (!promotion) return null;

  const discountLabel = Number.isInteger(promotion.discountPercent)
    ? `${promotion.discountPercent}%`
    : `${promotion.discountPercent.toFixed(1)}%`;

  const registerCta = shellNav ? (
    <button
      type="button"
      className="customer-promo-banner-link"
      onClick={() => shellNav.openRegister("register")}
    >
      Regístrate aquí
    </button>
  ) : (
    <Link href={promotion.registerPath} className="customer-promo-banner-link">
      Regístrate aquí
    </Link>
  );

  return (
    <div className="customer-promo-banner">
      <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        Obtén un <strong>{discountLabel} ADICIONAL</strong> al registrarte.{" "}
        {registerCta}. Puedes comprar igual sin cuenta.
      </p>
    </div>
  );
}
