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
    ship?: string | string[];
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
  const freeShippingOnly = pick(params.ship)?.trim() === "free";

  const listed = await listMercadoProducts({
    query,
    category,
    minPrice,
    maxPrice,
    supplierUserId,
    freeShippingOnly,
    limit: 96,
  });

  const products = listed.products ?? [];
  const facets = listed.facets ?? {
    categories: [],
    suppliers: [],
    priceMin: 0,
    priceMax: 0,
    freeShippingCount: 0,
  };

  return (
    <div className="mercado-mp-layout">
      <MercadoFiltersPanel facets={facets} resultCount={products.length} />

      <div className="mercado-mp-results">
        <div className="mercado-mp-results-head">
          <div>
            <p className="mercado-section-label">Ofertas del día</p>
            <h1 className="mercado-heading text-xl sm:text-2xl">
              {query ? `Resultados para “${query}”` : "Productos destacados"}
            </h1>
            <p className="mercado-subheading mt-1">
              Envío a nivel nacional · Compra protegida · Precios mayoristas
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            <strong className="font-semibold text-zinc-800">
              {products.length}
            </strong>{" "}
            resultado{products.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mercado-mp-trust-chips" aria-hidden="true">
          <span>Compra protegida</span>
          <span>Envío a nivel nacional</span>
          <span>Devolución fácil</span>
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
