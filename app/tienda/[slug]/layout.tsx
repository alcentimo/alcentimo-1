import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";

interface TiendaLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TiendaLayout({ children, params }: TiendaLayoutProps) {
  const { slug } = await params;
  const cartAuth = await getCartAuthContext(slug);
  const promotionContext = await getCatalogPromotionContext(
    slug,
    cartAuth.isCustomer,
  );
  const storeSettings = cartAuth.storeId
    ? await getPublicStoreSettingsConfig(cartAuth.storeId)
    : null;
  const wholesaleEnabled =
    storeSettings?.catalogCurrency.wholesaleEnabled ?? false;

  return (
    <CartProvider
      storeSlug={slug}
      storeId={cartAuth.storeId}
      userId={cartAuth.userId}
      isCustomer={cartAuth.isCustomer}
      wholesaleEnabled={wholesaleEnabled}
    >
      <PromotionProvider value={promotionContext}>{children}</PromotionProvider>
    </CartProvider>
  );
}
