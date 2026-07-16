import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getLatestUsdTasa } from "@/lib/exchange-rate/get-tasa-cambio";
import { formatExchangeRate } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) return "Sin registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function TasasPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/tasas");
  }

  const [exchangeRateRow, tasaRow] = await Promise.all([
    getCurrentExchangeRate(),
    getLatestUsdTasa(supabase),
  ]);

  const activeRate = exchangeRateRow?.rate ?? tasaRow?.tasa ?? null;
  const updatedAt = tasaRow?.ultima_actualizacion ?? exchangeRateRow?.created_at ?? null;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Configuración</p>
        <h1 className="page-header-title">Tasas del día</h1>
        <p className="page-header-desc">
          La tasa activa se aplica automáticamente a los precios en bolívares de
          tu catálogo público.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card-panel">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Tasa USD / Bs. vigente
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {activeRate != null ? `Bs. ${formatExchangeRate(activeRate)}` : "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Última actualización: {formatUpdatedAt(updatedAt)}
          </p>
        </section>

        <section className="card-panel">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Consistencia financiera
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Alcentimo sincroniza la tasa de cambio para que tus precios en Bs.
            reflejen el mercado al instante, sin cálculos manuales ni
            desactualizaciones en tu vitrina digital.
          </p>
          <Link href="/dashboard/ajustes" className="btn-brand-outline mt-5 inline-flex">
            Ajustes de tienda
          </Link>
        </section>
      </div>
    </PageContainer>
  );
}
