import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/inventario");
  }

  const { store } = session;

  if (!store) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="page-header">
          <p className="section-label">Catálogo</p>
          <h1 className="page-header-title">Productos</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para gestionar tu catálogo.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo">
            <Button className="btn-brand">Configurar mi tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const [{ products }, exchangeRate, productFormConfig] = await Promise.all([
    getStoreInventory(store.slug),
    getCurrentExchangeRate(),
    getStoreProductFormConfig(store.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="page-header">
        <p className="section-label">Catálogo</p>
        <h1 className="page-header-title">Productos</h1>
        <p className="page-header-desc">
          Gestiona tu catálogo, stock y precios desde un solo lugar.
        </p>
      </header>

      <InventoryPanel
        store={store}
        exchangeRate={exchangeRate?.rate ?? null}
        initialProducts={products}
        productFormConfig={productFormConfig}
      />
    </div>
  );
}
