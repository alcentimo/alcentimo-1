import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { listMercadoProducts } from "@/lib/mercado-oculto/product-actions";
import { MercadoProductGrid } from "@/components/mercado-oculto/MercadoProductGrid";
import { MercadoFiltersPanel } from "@/components/mercado-oculto/MercadoFiltersPanel";
import { isSupplierProductCategory } from "@/lib/supplier/categories";

export const dynamic = "force-dynamic";

function parseNumberParam(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function MercadoOcultoPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    min?: string | string[];
    max?: string | string[];
    supplier?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/mercado-oculto");
  }
  if (!hasMercadoOcultoSuperAdminUser(user)) {
    notFound();
  }

  const params = await searchParams;
  const pick = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const query = pick(params.q)?.trim() || undefined;
  const categoryRaw = pick(params.category)?.trim();
  const category =
    categoryRaw && isSupplierProductCategory(categoryRaw)
      ? categoryRaw
      : undefined;
  const minPrice = parseNumberParam(pick(params.min));
  const maxPrice = parseNumberParam(pick(params.max));
  const supplierUserId = pick(params.supplier)?.trim() || undefined;

  const listed = await listMercadoProducts({
    query,
    category,
    minPrice,
    maxPrice,
    supplierUserId,
    limit: 96,
  });

  const products = listed.products ?? [];
  const facets = listed.facets ?? {
    categories: [],
    suppliers: [],
    priceMin: 0,
    priceMax: 0,
  };

  return (
    <div className="mercado-mp-layout">
      <MercadoFiltersPanel facets={facets} resultCount={products.length} />

      <div className="mercado-mp-results">
        <div className="mercado-mp-results-head">
          <div>
            <p className="mercado-section-label">Marketplace B2B</p>
            <h1 className="mercado-heading text-xl sm:text-2xl">
              Catálogo mayorista
            </h1>
            <p className="mercado-subheading mt-1">
              Precios B2B del Mayorista Oficial Alcéntimo. Filtrá por categoría,
              proveedor o rango de precio.
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            <strong className="font-semibold text-zinc-800 dark:text-zinc-100">
              {products.length}
            </strong>{" "}
            resultado{products.length === 1 ? "" : "s"}
            {query ? ` para “${query}”` : ""}
          </p>
        </div>

        {listed.error ? (
          <p className="mercado-alert" role="alert">
            No se pudo cargar la vitrina ({listed.error}).
          </p>
        ) : (
          <MercadoProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
