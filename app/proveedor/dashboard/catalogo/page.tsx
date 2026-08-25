import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogPublicLinkMenu } from "@/components/dashboard/CatalogPublicLinkMenu";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import { listSupplierProducts } from "@/lib/supplier/actions";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorOwnCatalogPage() {
  const { storefront, store } = await requireSupplierHubSession({
    requireOwnStorefront: true,
  });

  const listed = await listSupplierProducts();
  const slug = storefront?.publicCatalogSlug || store?.slug || "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Productos Propios"
        description="Gestiona solo la mercancía de tu inventario. No hay catálogo de terceros ni importación mayorista."
        actions={
          slug ? (
            <CatalogPublicLinkMenu storeSlug={slug} />
          ) : null
        }
      />
      {listed.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudieron cargar los productos.
        </p>
      ) : null}
      <SupplierProductsPanel initialProducts={listed.products ?? []} />
    </div>
  );
}
