"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import type { CatalogPromotionContext } from "@/lib/promotions/types";

interface CustomerPromoBannerProps {
  promotion: CatalogPromotionContext["guestBanner"];
}

export function CustomerPromoBanner({ promotion }: CustomerPromoBannerProps) {
  if (!promotion) return null;

  const discountLabel = Number.isInteger(promotion.discountPercent)
    ? `${promotion.discountPercent}%`
    : `${promotion.discountPercent.toFixed(1)}%`;

  return (
    <div className="customer-promo-banner" role="status">
      <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        ¿Quieres <strong>{discountLabel}</strong> de descuento?{" "}
        <Link href={promotion.registerPath} className="customer-promo-banner-link">
          Regístrate
        </Link>{" "}
        y activa el beneficio exclusivo.
      </p>
    </div>
  );
}
