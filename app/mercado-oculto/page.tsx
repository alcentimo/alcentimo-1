import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveMercadoOcultoDenial } from "@/lib/mercado-oculto/access";
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

  const denial = resolveMercadoOcultoDenial(user);
  if (denial === "unauthenticated") {
    redirect("/dashboard/login?next=/mercado-oculto");
  }
  if (denial) {
    redirect(`/dashboard/catalogo?mercado_denied=${denial}`);
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
          Vista interna de productos de dropshipping integrados desde mayoristas
          oficiales. Inaccesible para suscriptores y clientes.
        </p>
      </header>

      <MercadoSearchForm initialQuery={query ?? ""} />

      {listed.error ? (
        <p className="mercado-alert" role="alert">
          No se pudo cargar la vitrina ({listed.error}). Si acabas de desplegar,
          aplica la migración{" "}
          <code className="rounded bg-white/70 px-1 dark:bg-zinc-900/50">
            113_mercado_oculto
          </code>
          .
        </p>
      ) : (
        <MercadoProductGrid products={listed.products ?? []} />
      )}
    </div>
  );
}
