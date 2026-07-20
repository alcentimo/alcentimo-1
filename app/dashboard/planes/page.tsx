import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { resolveProTrialStatus, shouldShowProTrialBanner } from "@/lib/plans/trial";
import { getCurrentExchangeRate } from "@/lib/catalog";
import {
  getLatestPermanentRejection,
  getUserPaymentReview,
} from "@/lib/plans/get-user-payment-review";
import { PlansPanel } from "@/components/dashboard/PlansPanel";
import { PaymentReviewPanel } from "@/components/dashboard/plans/PaymentReviewPanel";
import { PermanentRejectionNotice } from "@/components/dashboard/plans/PermanentRejectionNotice";
import { ProTrialBanner } from "@/components/dashboard/plans/ProTrialBanner";
import {
  PromoOfferBanner,
  SubscriptionCouponRedeemCard,
} from "@/components/dashboard/plans/SubscriptionPromoCards";
import { PageContainer } from "@/components/ui/PageContainer";
import { fetchSubscriptionPagoMovilDetails } from "@/lib/plans/get-subscription-pago-movil";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { buildPlanPricingTiers } from "@/lib/plans/plan-settings";
import { getOpenPromoOffersForUser } from "@/lib/plans/subscription-promo";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/planes");
  }

  const { authUser, store } = session;
  const trial = resolveProTrialStatus(authUser.profile);
  const showProTrialBanner = shouldShowProTrialBanner(authUser.profile);
  const [
    productLimitContext,
    exchangeRateRow,
    paymentReview,
    permanentRejection,
    pagoMovil,
    planSettings,
    promoOffers,
  ] = await Promise.all([
      store ? getStoreProductLimitContext(store.id) : Promise.resolve(null),
      getCurrentExchangeRate(),
      getUserPaymentReview(authUser.id),
      getLatestPermanentRejection(authUser.id),
      fetchSubscriptionPagoMovilDetails(),
      fetchPlanSettings(),
      getOpenPromoOffersForUser(authUser.id),
    ]);
  const exchangeRate = exchangeRateRow?.rate ?? null;
  const pricingTiers = buildPlanPricingTiers(planSettings);

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

      {paymentReview ? (
        <div className="mb-8 max-w-2xl">
          <PaymentReviewPanel review={paymentReview} />
        </div>
      ) : null}

      {!paymentReview && permanentRejection ? (
        <div className="mb-8 max-w-2xl">
          <PermanentRejectionNotice payment={permanentRejection} />
        </div>
      ) : null}

      {promoOffers.length > 0 ? (
        <div className="mb-6 max-w-2xl">
          <PromoOfferBanner offers={promoOffers} />
        </div>
      ) : null}

      <div className="mb-8 max-w-2xl">
        <SubscriptionCouponRedeemCard />
      </div>

      {store && showProTrialBanner ? (
        <div className="mb-8 max-w-3xl">
          <ProTrialBanner
            showBanner
            currentCount={productLimitContext?.currentCount ?? 0}
            trialEligible={trial.eligible}
            trialActive={trial.active}
            trialEndsAt={trial.endsAt}
          />
        </div>
      ) : null}

      <PlansPanel
        currentPlanId={authUser.planId}
        currentPlanName={authUser.plan.name}
        productCount={productLimitContext?.currentCount ?? null}
        productLimit={productLimitContext?.productLimit ?? null}
        exchangeRate={exchangeRate}
        trialActive={trial.active}
        trialEndsAt={trial.endsAt}
        subscriptionStatus={authUser.profile?.subscription_status ?? "none"}
        subscriptionPeriodEndsAt={
          authUser.profile?.subscription_period_ends_at ?? null
        }
        currentBillingPeriod={
          authUser.profile?.billing_period === "annual" ? "annual" : "monthly"
        }
        pagoMovil={pagoMovil}
        pricingTiers={pricingTiers}
      />
    </PageContainer>
  );
}
