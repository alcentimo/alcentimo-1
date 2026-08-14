import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import {
  hasMercadoOcultoSubscription,
  resolveMercadoOcultoDenial,
} from "@/lib/mercado-oculto/access";
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
  const authUser = await getAuthUserWithPlan(supabase);

  if (!authUser) {
    redirect("/dashboard/login?next=/mercado-oculto");
  }

  const denial = resolveMercadoOcultoDenial(authUser.profile, true);
  if (denial || !hasMercadoOcultoSubscription(authUser.profile)) {
    redirect("/dashboard/planes?mercado_denied=1");
  }

  const params = await searchParams;
  const qRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = qRaw?.trim() || undefined;

  const listed = await listMercadoProducts({ query, limit: 72 });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="mercado-section-label">Directorio privado</p>
        <h1 className="mercado-heading">Vitrina de suscriptores</h1>
        <p className="mercado-subheading">
          Productos activos de tiendas con suscripción Alcéntimo. Negocia por
          chat interno; el pago y el envío se coordinan fuera de la plataforma.
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
