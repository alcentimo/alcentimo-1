import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ManualPaymentsPanel } from "@/components/admin/ManualPaymentsPanel";
import { getManualPayments } from "@/lib/plans/get-manual-payments";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";

export const dynamic = "force-dynamic";

export default async function AdminPagosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/admin/pagos");
  }

  if (!isSupportAdmin(resolveAuthEmail(user))) {
    redirect("/dashboard/catalogo?admin_denied=not_listed");
  }

  let payments: Awaited<ReturnType<typeof getManualPayments>> = [];
  let loadError: string | null = null;

  try {
    payments = await getManualPayments({ status: "all", limit: 200 });
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los pagos manuales.";
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-7 sm:py-10">
      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard/catalogo"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Volver al dashboard
          </Link>
          <Link
            href="/admin/soporte"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Soporte
          </Link>
        </div>
        <div>
          <p className="section-label">Administración</p>
          <h1 className="page-header-title">Pagos manuales</h1>
          <p className="page-header-desc">
            Verifica comprobantes de Pago Móvil. Al verificar, la suscripción Pro
            pasa a permanente; al rechazar, se revoca el acceso provisional.
          </p>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
        </p>
      ) : (
        <ManualPaymentsPanel initialPayments={payments} />
      )}
    </div>
  );
}
