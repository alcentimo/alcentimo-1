"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { CustomerSessionProvider } from "@/components/catalog-transactional/CustomerSessionProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { CatalogPwaHeadLinks } from "@/components/catalog-transactional/CatalogPwaHeadLinks";
import {
  fetchPublicCatalogLayoutBootstrap,
  type PublicCatalogLayoutBootstrap,
} from "@/lib/catalog/fetch-public-catalog-bootstrap";
import { cn } from "@/lib/cn";
import type { CatalogPromotionContext } from "@/lib/promotions/types";

const emptyPromotion: CatalogPromotionContext = {
  guestBanner: null,
  autoApply: null,
};

type ReadyLayout = Extract<PublicCatalogLayoutBootstrap, { ok: true }>;

/**
 * Layout `/c/[slug]` sin awaits en el servidor: providers mínimos al instante,
 * datos de tienda/sesión en useEffect.
 */
export function PublicCatalogLayoutClient({
  storeSlug,
  children,
}: {
  storeSlug: string;
  children: ReactNode;
}) {
  const slug = storeSlug.trim().toLowerCase();
  const [layout, setLayout] = useState<ReadyLayout | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    void fetchPublicCatalogLayoutBootstrap(slug).then((result) => {
      if (cancelled || !result.ok) return;
      setLayout(result);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const themeStyle = (layout?.themeContext?.style ?? undefined) as
    | CSSProperties
    | undefined;

  return (
    <div
      className={cn(
        "txn-catalog-root",
        layout?.themeContext?.rubroClass,
        layout?.themeContext?.designClasses,
      )}
      style={themeStyle}
    >
      {layout ? (
        <CatalogPwaHeadLinks
          manifestAbsoluteUrl={layout.manifestAbsoluteUrl}
          storeSlug={slug}
        />
      ) : null}

      <CartProvider
        key={layout?.storeId ?? `anon-${slug}`}
        storeSlug={slug}
        storeId={layout?.storeId ?? null}
        userId={layout?.userId ?? null}
        isCustomer={layout?.isCustomer ?? false}
        wholesaleEnabled={layout?.wholesaleEnabled ?? false}
      >
        <PromotionProvider value={layout?.promotionContext ?? emptyPromotion}>
          <CustomerSessionProvider
            key={layout?.userId ?? `session-${slug}`}
            storeSlug={slug}
            initial={{
              isCustomer: layout?.isCustomer ?? false,
              userId: layout?.userId ?? null,
              displayName: layout?.displayName ?? null,
              phone: layout?.phone ?? null,
              contactEmail: layout?.contactEmail ?? null,
            }}
          >
            <CatalogAppShell
              storeSlug={slug}
              storeName={layout?.store.name ?? ""}
              storeLogoUrl={layout?.storeLogoUrl ?? null}
              storeDescription={layout?.store.description ?? null}
              locationHours={layout?.locationHours ?? null}
              storeRubro={layout?.store.rubro_tienda}
              enablePcBuilder={layout?.store.enable_pc_builder}
              assistantEnabled={layout?.assistantEnabled ?? false}
              whatsappPhone={layout?.whatsappPhone ?? null}
              supportAvatarUrl={layout?.supportAvatarUrl ?? null}
              supportAvatarAnimation={layout?.supportAvatarAnimation ?? null}
              supportAvatarAnimated={layout?.supportAvatarAnimated ?? false}
              supportMerchantName={layout?.supportMerchantName ?? null}
              customerAccountMode={layout?.customerAccountMode ?? "hibrido"}
            >
              {children}
            </CatalogAppShell>
          </CustomerSessionProvider>
        </PromotionProvider>
      </CartProvider>
    </div>
  );
}
