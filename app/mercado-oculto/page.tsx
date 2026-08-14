import { listMercadoProducts } from "@/lib/mercado-oculto/product-actions";
import { MercadoProductGrid } from "@/components/mercado-oculto/MercadoProductGrid";
import { MercadoSearchForm } from "@/components/mercado-oculto/MercadoSearchForm";
import { MercadoPublishButton } from "@/components/mercado-oculto/MercadoPublishButton";

export const dynamic = "force-dynamic";

export default async function MercadoOcultoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const qRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = qRaw?.trim() || undefined;

  const listed = await listMercadoProducts({ query, limit: 72 });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="mercado-section-label">Vitrina abierta</p>
          <h1 className="mercado-heading">Mercado oculto</h1>
          <p className="mercado-subheading">
            Catálogo público de productos de dropshipping que los suscriptores
            integraron desde los mayoristas oficiales de Alcéntimo. Ver es
            gratis; para chatear o publicar necesitas cuenta y suscripción
            activa. El pago y el envío se coordinan fuera de la plataforma.
          </p>
        </div>
        <MercadoPublishButton />
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
