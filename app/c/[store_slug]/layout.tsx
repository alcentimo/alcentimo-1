import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";

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

  return (
    <div className="txn-catalog-root">
      <CartProvider
        storeSlug={storeSlug}
        storeId={cartAuth.storeId}
        userId={cartAuth.userId}
        isCustomer={cartAuth.isCustomer}
      >
        <CatalogAppShell storeSlug={storeSlug}>{children}</CatalogAppShell>
      </CartProvider>
    </div>
  );
}
