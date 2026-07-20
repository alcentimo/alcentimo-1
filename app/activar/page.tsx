import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";
import {
  hasUnusedProTrial,
  resolveProTrialStatus,
  shouldShowProTrialOnActivar,
} from "@/lib/plans/trial";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import { getUserPaymentReview } from "@/lib/plans/get-user-payment-review";
import { PlansPanel } from "@/components/dashboard/PlansPanel";
import { PaymentReviewPanel } from "@/components/dashboard/plans/PaymentReviewPanel";
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
  const paymentReview = await getUserPaymentReview(authUser.id);

  // Si hay pago en revisión o corrección, no mostrar la pantalla limpia de planes.
  if (paymentReview) {
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
            <p className="section-label">Suscripción</p>
            <h1 className="page-header-title">
              {paymentReview.needsCorrection
                ? "Corrección de comprobante"
                : "Pago en revisión"}
            </h1>
            <p className="page-header-desc">
              Tu solicitud sigue activa. Aquí verás el estado y, si hace falta,
              podrás corregir el comprobante.
            </p>
          </header>

          <div className="max-w-2xl">
            <PaymentReviewPanel review={paymentReview} />
          </div>
        </PageContainer>
      </main>
    );
  }

  const [productLimitStatus, exchangeRateRow] = await Promise.all([
    store ? getStoreProductLimitContext(store.id) : Promise.resolve(null),
    getCurrentExchangeRate(),
  ]);

  const trial = resolveProTrialStatus(authUser.profile);
  const trialEligible = isEligiblePlanForProTrial(authUser.profile);
  const hasUnusedTrial = hasUnusedProTrial(authUser.profile);
  const showProTrialSection = shouldShowProTrialOnActivar(authUser.profile);
  const currentCount = productLimitStatus?.currentCount ?? 0;
  const atProductLimit = productLimitStatus?.hasReachedLimit ?? false;
  const forceClaimUnlocked =
    trialEligible &&
    hasUnusedTrial &&
    (atProductLimit || isProTrialUnlockReady(currentCount));

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
            {showProTrialSection && !trial.active
              ? atProductLimit || forceClaimUnlocked
                ? `Has alcanzado el límite de 10 productos. Reclama tu mes de prueba Pro (250 productos) con ALCENTIMO o elige un plan de pago${store ? ` para ${store.name}` : ""}.`
                : `Completa 10 productos para desbloquear tu mes de prueba Pro (250 productos) o elige un plan de pago${store ? ` para ${store.name}` : ""}.`
              : `Elige el plan que mejor se adapte a tu negocio${store ? ` · ${store.name}` : ""}.`}
          </p>
        </header>

        {showProTrialSection ? (
          <div className="mb-8 max-w-3xl">
            <ProTrialBanner
              showBanner
              currentCount={currentCount}
              trialEligible={trialEligible}
              trialActive={trial.active}
              trialEndsAt={trial.endsAt}
              forceClaimUnlocked={forceClaimUnlocked}
            />
          </div>
        ) : null}

        {showProTrialSection && !trial.active ? (
          <p className="mb-4 max-w-2xl text-sm font-medium text-neutral-600 dark:text-neutral-400">
            También puedes elegir un plan de pago
          </p>
        ) : null}

        <PlansPanel
          currentPlanId={authUser.planId}
          currentPlanName={authUser.plan.name}
          productCount={productLimitStatus?.currentCount ?? null}
          productLimit={productLimitStatus?.productLimit ?? null}
          exchangeRate={exchangeRateRow?.rate ?? null}
          trialActive={trial.active}
          trialEndsAt={trial.endsAt}
          subscriptionStatus={authUser.profile?.subscription_status ?? "none"}
          subscriptionPeriodEndsAt={
            authUser.profile?.subscription_period_ends_at ?? null
          }
          currentBillingPeriod={
            authUser.profile?.billing_period === "annual" ? "annual" : "monthly"
          }
        />
      </PageContainer>
    </main>
  );
}
