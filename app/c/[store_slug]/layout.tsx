import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";

interface TransactionalCatalogLayoutProps {
  children: ReactNode;
  params: Promise<{ store_slug: string }>;
}

export default async function TransactionalCatalogLayout({
  children,
  params,
}: TransactionalCatalogLayoutProps) {
  const { store_slug: storeSlug } = await params;

  return (
    <div className="txn-catalog-root">
      <CartProvider storeSlug={storeSlug}>
        <CatalogAppShell storeSlug={storeSlug}>{children}</CatalogAppShell>
      </CartProvider>
    </div>
  );
}
