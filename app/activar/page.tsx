import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { resolveProTrialStatus } from "@/lib/plans/trial";
import { PlansPanel } from "@/components/dashboard/PlansPanel";
import { ProTrialBanner } from "@/components/dashboard/plans/ProTrialBanner";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function ActivarPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/activar");
  }

  const { authUser, store } = session;
  const [productLimitStatus, exchangeRateRow] = await Promise.all([
    store ? getStoreProductLimitContext(store.id) : Promise.resolve(null),
    getCurrentExchangeRate(),
  ]);
  const trial = resolveProTrialStatus(authUser.profile);

  return (
    <main className="page-shell-auth min-h-dvh safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer className="relative py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo href="/dashboard/catalogo" />
          <Link
            href="/dashboard/catalogo"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al panel
          </Link>
        </div>

        <header className="page-header mb-6 max-w-2xl">
          <p className="section-label">Activación</p>
          <h1 className="page-header-title">Activa tu cuenta</h1>
          <p className="page-header-desc">
            El plan Gratis incluye 10 productos. Prueba Pro gratis por 1 mes (250
            productos) o elige un plan de pago{store ? ` para ${store.name}` : ""}.
          </p>
        </header>

        <div className="mb-8 max-w-3xl">
          <ProTrialBanner
            trialEligible={trial.eligible}
            trialActive={trial.active}
            trialEndsAt={trial.endsAt}
          />
        </div>

        <PlansPanel
          currentPlanId={authUser.planId}
          currentPlanName={
            trial.active
              ? "Pro (prueba)"
              : authUser.planId === "free"
                ? "Gratis"
                : authUser.plan.name
          }
          productCount={productLimitStatus?.currentCount ?? null}
          productLimit={productLimitStatus?.productLimit ?? null}
          exchangeRate={exchangeRateRow?.rate ?? null}
          trialActive={trial.active}
          trialEndsAt={trial.endsAt}
        />
      </PageContainer>
    </main>
  );
}
