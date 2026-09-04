"use client";

import Link from "next/link";
import { Cpu, ShoppingBag } from "lucide-react";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { StoreBrandMark } from "@/components/catalog/StoreBrandMark";
import type { Store } from "@/lib/database.types";
import type { LocationHoursSettings } from "@/lib/store-settings/types";
import { storeHasPCBuilderFromStore } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { getStoreCatalogUrl } from "@/lib/stores";
import { resolveStoreLogoUrl } from "@/lib/stores/logo-url";

interface StoreHeaderProps {
  store: Store;
  cartCount: number;
  locationHours: LocationHoursSettings;
  onCartClick: () => void;
}

function StoreLogo({ store }: { store: Store }) {
  return (
    <StoreBrandMark
      logoUrl={resolveStoreLogoUrl(store)}
      storeName={store.name}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
      initialsClassName="h-9 w-9 bg-zinc-900 text-[11px] font-semibold tracking-tight text-white"
      logoClassName="h-10 max-h-10 w-auto max-w-[11rem] bg-transparent"
      imageClassName="h-full max-h-8 w-auto max-w-[10.5rem] object-contain object-left"
    />
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

  return (
    <>
      <div className="store-banner safe-area-inset">
        <p className="truncate px-4">{store.name}</p>
      </div>

      <header className="store-header safe-area-inset">
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
