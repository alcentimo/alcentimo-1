"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";
import { usePathname } from "next/navigation";

interface StorefrontGiftCardBannerProps {
  storeSlug: string;
  productSlug: string;
  storeName: string;
}

/** Banner de impacto para la tarjeta de regalo en la vitrina del administrador. */
export function StorefrontGiftCardBanner({
  storeSlug,
  productSlug,
  storeName,
}: StorefrontGiftCardBannerProps) {
  const pathname = usePathname();
  const href = getStoreProductDeepLinkPath(storeSlug, productSlug, { pathname });

  return (
    <section className="storefront-gift-banner" aria-label="Tarjeta de regalo">
      <Link href={href} className="storefront-gift-banner-link">
        <span className="storefront-gift-banner-icon" aria-hidden="true">
          <Gift className="h-7 w-7" strokeWidth={1.6} />
        </span>
        <span className="storefront-gift-banner-copy">
          <span className="storefront-gift-banner-kicker">Envío instantáneo</span>
          <span className="storefront-gift-banner-title">Tarjeta de regalo {storeName}</span>
          <span className="storefront-gift-banner-sub">
            Elige un monto, recibe un código digital y úsalo en cualquier compra de la tienda.
          </span>
        </span>
        <span className="storefront-gift-banner-cta">Ver tarjeta</span>
      </Link>
    </section>
  );
}
