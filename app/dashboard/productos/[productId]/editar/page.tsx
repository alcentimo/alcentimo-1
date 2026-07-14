import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getProductForEdit, getStoreCategories } from "@/lib/products/actions";
import { getStoreProductFieldConfig } from "@/lib/products/store-field-config";
import { ProductForm } from "@/components/dashboard/ProductForm";
import { PageContainer } from "@/components/ui/PageContainer";
import { formatExchangeRate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect(`/dashboard/login?next=/dashboard/productos/${productId}/editar`);
  }

  const { store } = session;
  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const [product, exchangeRate, categories, fieldConfig] = await Promise.all([
    getProductForEdit(productId),
    getCurrentExchangeRate(),
    getStoreCategories(store.id),
    getStoreProductFieldConfig(store.id),
  ]);

  if (!product) notFound();

  return (
    <PageContainer as="main" narrow className="py-6 sm:py-8 lg:py-10">
      <header className="page-header">
        <p className="section-label">Catálogo</p>
        <h1 className="page-header-title">Editar producto</h1>
        <p className="page-header-desc">
          Actualiza nombre, precio, stock, variantes e imagen de tu producto.
        </p>
        {exchangeRate?.rate != null && (
          <div className="mt-4">
            <span className="price-rate-badge gap-1.5 px-3 py-1.5">
              Tasa del día: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
            </span>
          </div>
        )}
      </header>

      <div className="card-panel">
        <ProductForm
          store={store}
          categories={categories}
          exchangeRate={exchangeRate?.rate ?? null}
          fieldLabels={fieldConfig.fieldLabels}
          storeCategoryLabel={fieldConfig.categoryLabel}
          mode="edit"
          initialData={product}
        />
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/dashboard/inventario" className="link-brand">
          ← Volver al inventario
        </Link>
      </p>
    </PageContainer>
  );
}
