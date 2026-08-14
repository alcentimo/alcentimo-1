import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { listMercadoProducts } from "@/lib/mercado-oculto/product-actions";
import { MercadoProductGrid } from "@/components/mercado-oculto/MercadoProductGrid";
import { MercadoSearchForm } from "@/components/mercado-oculto/MercadoSearchForm";

export const dynamic = "force-dynamic";

export default async function MercadoOcultoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sesión Super Admin → entra directo. Sin sesión → login con retorno aquí.
  // Otros usuarios → 404 (ruta oculta).
  if (!user) {
    redirect("/dashboard/login?next=/mercado-oculto");
  }
  if (!hasMercadoOcultoSuperAdminUser(user)) {
    notFound();
  }

  const params = await searchParams;
  const qRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = qRaw?.trim() || undefined;

  const listed = await listMercadoProducts({ query, limit: 72 });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="mercado-section-label">Solo Super Admin</p>
        <h1 className="mercado-heading">Mercado oculto</h1>
        <p className="mercado-subheading">
          Catálogo interno de productos cargados por el Administrador General o
          por mayoristas asociados de Alcéntimo.
        </p>
      </header>

      <MercadoSearchForm initialQuery={query ?? ""} />

      {listed.error ? (
        <p className="mercado-alert" role="alert">
          No se pudo cargar la vitrina ({listed.error}). Aplica las migraciones{" "}
          <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
            113_mercado_oculto
          </code>{" "}
          y{" "}
          <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
            114_mercado_oculto_supplier_products
          </code>
          .
        </p>
      ) : (
        <MercadoProductGrid products={listed.products ?? []} />
      )}
    </div>
  );
}
