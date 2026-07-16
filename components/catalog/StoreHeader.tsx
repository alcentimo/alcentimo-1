"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import type { Store } from "@/lib/database.types";
import type { LocationHoursSettings } from "@/lib/store-settings/types";

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
  return (
    <>
      <div className="store-banner safe-area-inset">
        <p className="truncate px-4">{store.name}</p>
      </div>

      <header className="store-header safe-area-inset">
        <div className="store-header-inner">
          <Link href={`/tienda/${store.slug}`} className="flex min-w-0 items-center gap-3">
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
      </header>
    </>
  );
}
