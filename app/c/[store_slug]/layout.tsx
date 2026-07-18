import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { recordCatalogVisit } from "@/lib/analytics/track-catalog-visit";

interface TransactionalCatalogLayoutProps {
  children: ReactNode;
  params: Promise<{ store_slug: string }>;
}

export default async function TransactionalCatalogLayout({
  children,
  params,
}: TransactionalCatalogLayoutProps) {
  const { store_slug: storeSlug } = await params;
  const cartAuth = await getCartAuthContext(storeSlug);
  const promotionContext = await getCatalogPromotionContext(
    storeSlug,
    cartAuth.isCustomer,
  );

  if (cartAuth.storeId) {
    void recordCatalogVisit(storeSlug, cartAuth.storeId, cartAuth.userId);
  }

  return (
    <div className="txn-catalog-root">
      <CartProvider
        storeSlug={storeSlug}
        storeId={cartAuth.storeId}
        userId={cartAuth.userId}
        isCustomer={cartAuth.isCustomer}
      >
        <PromotionProvider value={promotionContext}>
          <CatalogAppShell storeSlug={storeSlug}>{children}</CatalogAppShell>
        </PromotionProvider>
      </CartProvider>
    </div>
  );
}
