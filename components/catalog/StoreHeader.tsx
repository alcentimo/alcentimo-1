"use client";

import Image from "next/image";
import Link from "next/link";
import { Cpu, ShoppingBag } from "lucide-react";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import type { Store } from "@/lib/database.types";
import type { LocationHoursSettings } from "@/lib/store-settings/types";
import { isGifImageUrl } from "@/lib/media/is-gif-url";
import { storeHasPCBuilderFromStore } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { getStoreCatalogUrl } from "@/lib/stores";
import { useHideOnScroll } from "@/lib/hooks/useHideOnScroll";
import { cn } from "@/lib/cn";

interface StoreHeaderProps {
  store: Store;
  cartCount: number;
  locationHours: LocationHoursSettings;
  onCartClick: () => void;
}

function StoreLogo({ store }: { store: Store }) {
  if (store.logo_url) {
    return (
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
        <Image
          src={store.logo_url}
          alt={store.name}
          fill
          sizes="44px"
          className="object-cover"
          unoptimized={isGifImageUrl(store.logo_url)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-sm font-bold text-zinc-800 shadow-sm">
      {store.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function StoreHeader({
  store,
  cartCount,
  locationHours,
  onCartClick,
}: StoreHeaderProps) {
  const pcBuilderEnabled = storeHasPCBuilderFromStore(store);
  const catalogUrl = getStoreCatalogUrl(store.slug);
  const scrollHidden = useHideOnScroll();

  return (
    <>
      <div className="store-banner safe-area-inset">
        <p className="truncate px-4">{store.name}</p>
      </div>

      <header
        className={cn(
          "store-header safe-area-inset",
          scrollHidden && "store-header--scroll-hidden",
        )}
      >
        <div className="store-header-inner">
          <Link href={catalogUrl} className="flex min-w-0 items-center gap-3">
            <StoreLogo store={store} />
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-zinc-900 sm:text-lg">
                {store.name}
              </span>
              <StoreOpenBadge
                locationHours={locationHours}
                className="mt-1"
              />
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {pcBuilderEnabled ? (
              <Link
                href={`${catalogUrl}/armar-pc`}
                className="store-pc-builder-link"
              >
                <Cpu className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Arma tu PC</span>
              </Link>
            ) : null}

            <button
              type="button"
              onClick={onCartClick}
              className="store-cart-btn"
              aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ""}`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="store-cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
