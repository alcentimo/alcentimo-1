"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { useGiftCardsEnabled } from "@/components/catalog-transactional/GiftCardStorefrontProvider";
import {
  getGiftCardStorefrontPath,
  isGiftCardStorefrontPath,
} from "@/lib/gift-cards/storefront-path";
import { cn } from "@/lib/cn";

export function StorefrontGiftCardHomeCta({ storeSlug }: { storeSlug: string }) {
  const enabled = useGiftCardsEnabled();
  const pathname = usePathname();
  if (!enabled) return null;

  const href = getGiftCardStorefrontPath(storeSlug, pathname);

  return (
    <section
      className="mb-5 sm:mb-6"
      aria-labelledby="storefront-gift-card-cta-title"
    >
      <Link
        href={href}
        className="flex flex-col gap-3 rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-4 shadow-sm transition hover:border-teal-400 hover:shadow-md dark:border-teal-800 dark:from-teal-950/50 dark:to-emerald-950/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="storefront-gift-card-cta-title"
              className="text-base font-semibold text-teal-950 dark:text-teal-50"
            >
              Comprar tarjeta de regalo
            </h2>
            <p className="mt-0.5 text-sm text-teal-800/90 dark:text-teal-200/90">
              Elige un monto o uno personalizado. Producto digital: recibes un
              código para abonar o regalar.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
          Elegir monto
        </span>
      </Link>
    </section>
  );
}

export function StorefrontGiftCardNavLink({
  storeSlug,
  compact = false,
}: {
  storeSlug: string;
  compact?: boolean;
}) {
  const enabled = useGiftCardsEnabled();
  const pathname = usePathname();
  if (!enabled) return null;

  const href = getGiftCardStorefrontPath(storeSlug, pathname);
  const active = isGiftCardStorefrontPath(pathname);

  return (
    <Link
      href={href}
      prefetch
      className={cn("mercado-nav-link", active && "mercado-nav-link-active")}
      title="Comprar tarjeta de regalo"
    >
      <Gift className="h-4 w-4" aria-hidden="true" />
      <span className="mercado-nav-label">
        {compact ? "Tarjeta" : "Tarjeta de regalo"}
      </span>
    </Link>
  );
}

export function StorefrontGiftCardSheetLink({
  storeSlug,
  onNavigate,
}: {
  storeSlug: string;
  onNavigate: (href: string) => void;
}) {
  const enabled = useGiftCardsEnabled();
  const pathname = usePathname();
  if (!enabled) return null;

  const href = getGiftCardStorefrontPath(storeSlug, pathname);

  return (
    <button
      type="button"
      className="catalog-profile-link-btn"
      onClick={() => onNavigate(href)}
    >
      <Gift className="h-4 w-4 shrink-0" aria-hidden="true" />
      Comprar tarjeta de regalo
    </button>
  );
}
