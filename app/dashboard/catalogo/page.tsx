import { Suspense } from "react";
import { CatalogoPageClient } from "@/components/dashboard/CatalogoPageClient";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

/**
 * Sin async / sin await: el HTML del título sale al instante.
 * Toda la data vive en CatalogoPageClient (useEffect).
 */
export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-6">
          <DashboardPageHeader
            title="Catálogo"
            description="Gestiona lo que vendes: productos, fotos, precios y stock."
          />
          <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Preparando el listado de productos…
          </div>
        </div>
      }
    >
      <CatalogoPageClient />
    </Suspense>
  );
}
