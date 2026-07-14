import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreInventory } from "@/lib/inventory";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";

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
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </div>
    );
  }

  const { products } = await getStoreInventory(store.slug);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="page-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-label">Catálogo</p>
            <h1 className="page-header-title">Productos</h1>
            <p className="page-header-desc">
              Gestiona los productos de tu tienda y sus niveles de stock.
            </p>
          </div>
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand shrink-0 gap-2 shadow-sm sm:self-start"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Link>
        </div>
      </header>

      <InventoryPanel products={products} />
    </div>
  );
}
