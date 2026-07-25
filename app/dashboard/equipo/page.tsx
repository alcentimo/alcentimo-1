import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { TeamTab } from "@/components/dashboard/settings/TeamTab";
import { getStoreTeamSnapshot } from "@/lib/team/get-store-team";
import { requireDashboardRouteAccess } from "@/lib/team/route-guard";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const { session } = await requireDashboardRouteAccess("/dashboard/equipo", {
    minimumRole: "admin",
  });

  const { store, authUser } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <DashboardPageHeader
          sectionLabel="Administración"
          title="Equipo"
          description="Invita encargados y vendedores a colaborar en tu tienda."
        />
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const team = await getStoreTeamSnapshot({
    store,
    currentUserId: authUser.id,
  }).catch(() => null);

  return (
    <PageContainer as="div" className="mx-auto max-w-4xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      <DashboardPageHeader
        sectionLabel="Administración"
        title="Equipo"
        description={`Gestiona quién puede acceder al panel de ${store.name}.`}
      />

      {team ? (
        <TeamTab initialTeam={team} />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          No se pudo cargar el equipo. Verifica que la migración de invitaciones esté aplicada.
        </div>
      )}
    </PageContainer>
  );
}
