import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default function VentasPage() {
  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Ventas</p>
        <h1 className="page-header-title">Registro de ventas</h1>
        <p className="page-header-desc">
          Lleva el control de tus ventas diarias y consulta el historial del mes.
        </p>
      </header>

      <div className="card-panel border-dashed">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
          Próximamente
        </p>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Módulo de ventas en desarrollo. Los KPIs del inicio usan datos simulados
          mientras integramos esta funcionalidad.
        </p>
      </div>
    </PageContainer>
  );
}
