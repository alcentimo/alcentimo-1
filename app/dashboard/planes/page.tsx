import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { resolveProTrialStatus } from "@/lib/plans/trial";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { PlansPanel } from "@/components/dashboard/PlansPanel";
import { ProTrialBanner } from "@/components/dashboard/plans/ProTrialBanner";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/planes");
  }

  const { authUser, store } = session;
  const trial = resolveProTrialStatus(authUser.profile);
  const productLimitContext = store
    ? await getStoreProductLimitContext(store.id)
    : null;
  const exchangeRateRow = await getCurrentExchangeRate();
  const exchangeRate = exchangeRateRow?.rate ?? null;

  return (
    <PageContainer as="div" className="mx-auto max-w-6xl py-6 sm:py-8">
      <header className="mb-8 text-center md:text-left">
        <p className="section-label">Configuración</p>
        <h1 className="page-header-title">Equipo y planes</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Gestiona la capacidad de tu organización, usuarios y plan de suscripción
          {store ? ` · ${store.name}` : ""}.
        </p>
      </header>

      {store ? (
        <div className="mb-8 max-w-3xl">
          <ProTrialBanner
            currentCount={productLimitContext?.currentCount ?? 0}
            trialEligible={trial.eligible}
            trialActive={trial.active}
            trialEndsAt={trial.endsAt}
          />
        </div>
      ) : null}

      <PlansPanel
        currentPlanId={authUser.planId}
        currentPlanName={
          trial.active
            ? "Pro (prueba)"
            : authUser.planId === "free"
              ? "Gratis"
              : authUser.plan.name
        }
        productCount={productLimitContext?.currentCount ?? null}
        productLimit={productLimitContext?.productLimit ?? null}
        exchangeRate={exchangeRate}
        trialActive={trial.active}
        trialEndsAt={trial.endsAt}
      />
    </PageContainer>
  );
}
