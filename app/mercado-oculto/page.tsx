import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { getCachedMercadoCatalog } from "@/lib/mercado-oculto/catalog-cache";
import {
  emptyMercadoFacets,
  type MercadoCatalogFilters,
} from "@/lib/mercado-oculto/filter-catalog";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";
import { MercadoCatalogProvider } from "@/components/mercado-oculto/MercadoCatalogProvider";
import { MercadoCatalogView } from "@/components/mercado-oculto/MercadoCatalogView";

export const dynamic = "force-dynamic";

function pick(
  value: string | string[] | undefined,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
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
  const initialFilters: MercadoCatalogFilters = {
    q: pick(params.q),
    category: pick(params.category),
    min: pick(params.min),
    max: pick(params.max),
    supplier: pick(params.supplier),
    ship: pick(params.ship),
  };

  let products: MercadoProductCard[] = [];
  let facets = emptyMercadoFacets();
  let error: string | null = null;

  try {
    const catalog = await getCachedMercadoCatalog();
    products = catalog.products;
    facets = catalog.facets;
  } catch (err) {
    error = err instanceof Error ? err.message : "Error al cargar el catálogo.";
  }

  return (
    <MercadoCatalogProvider
      products={products}
      facets={facets}
      error={error}
      initialFilters={initialFilters}
    >
      <MercadoCatalogView />
    </MercadoCatalogProvider>
  );
}
