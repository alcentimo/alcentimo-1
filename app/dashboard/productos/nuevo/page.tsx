import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreCategories } from "@/lib/products/actions";
import { CreateStoreForm } from "@/components/dashboard/CreateStoreForm";
import { ProductForm } from "@/components/dashboard/ProductForm";
import { PageContainer } from "@/components/ui/PageContainer";
import { formatExchangeRate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/productos/nuevo");
  }

  const { store } = session;
  const exchangeRate = await getCurrentExchangeRate();

  return (
    <PageContainer as="main" narrow className="py-6 sm:py-8 lg:py-10">
      <header className="page-header">
        <p className="section-label">Catálogo</p>
        <h1 className="page-header-title">Nuevo producto</h1>
        <p className="page-header-desc">
          Los productos publicados aparecen al instante en tu catálogo público.
        </p>
        {exchangeRate?.rate != null && (
          <div className="mt-4">
            <span className="price-rate-badge gap-1.5 px-3 py-1.5">
              Tasa del día: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
            </span>
          </div>
        )}
      </header>

      {!store ? (
        <div className="card-panel">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Crea tu tienda primero
          </h2>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            Necesitas una tienda antes de publicar productos.
          </p>
          <div className="mt-6">
            <CreateStoreForm />
          </div>
        </div>
      ) : (
        <div className="card-panel">
          <ProductForm
            store={store}
            categories={await getStoreCategories(store.id)}
            exchangeRate={exchangeRate?.rate ?? null}
          />
        </div>
      )}

      {store && (
        <p className="mt-6 text-center text-sm text-zinc-500">
          Catálogo público:{" "}
          <Link href={`/tienda/${store.slug}`} className="link-brand">
            /tienda/{store.slug}
          </Link>
        </p>
      )}
    </PageContainer>
  );
}
