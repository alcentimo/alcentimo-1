import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function CatalogoLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Catálogo"
        description="Gestiona lo que vendes: productos, fotos, precios y stock."
      />
      <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Preparando el listado de productos…
      </div>
    </div>
  );
}
