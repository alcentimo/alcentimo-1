import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";

export const dynamic = "force-dynamic";

export default async function ReferidosPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/referidos");
  }

  const { store } = session;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Gestión de clientes</p>
        <h1 className="page-header-title">Referidos</h1>
        <p className="page-header-desc">
          Amplía tu base de clientes con un programa de referidos
          {store ? ` para ${store.name}` : ""}.
        </p>
      </header>

      <div className="card-panel flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Programa de referidos en preparación
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Mientras tanto, puedes impulsar conversiones con cupones y
              promociones desde la configuración de tu tienda.
            </p>
          </div>
        </div>
        <Link href="/dashboard/catalogo?tab=ajustes" className="btn-brand-outline shrink-0">
          Ir a promociones
        </Link>
      </div>
    </PageContainer>
  );
}
