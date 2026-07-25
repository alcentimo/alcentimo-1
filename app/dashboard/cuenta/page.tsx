import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { AccountSettingsPanel } from "@/components/dashboard/account/AccountSettingsPanel";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { buildAccountSnapshot } from "@/lib/account/get-account-snapshot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CuentaPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CuentaPage({ searchParams }: CuentaPageProps) {
  const session = await getDashboardSession();
  if (!session) {
    redirect("/dashboard/login?next=/dashboard/cuenta");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/dashboard/cuenta");
  }

  const account = buildAccountSnapshot(user, session);
  const { tab } = await searchParams;

  return (
    <PageContainer as="div" className="mx-auto max-w-4xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      <DashboardPageHeader
        sectionLabel="Cuenta"
        title="Perfil y seguridad"
        description="Administra tus datos personales, contraseña y sesión. La configuración de la tienda está en el menú principal."
      />

      <Suspense
        fallback={
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            Cargando ajustes de cuenta…
          </div>
        }
      >
        <AccountSettingsPanel account={account} initialTab={tab} />
      </Suspense>
    </PageContainer>
  );
}
