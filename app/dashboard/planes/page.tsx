import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import {
  resolveProTrialStatus,
  shouldShowProTrialBanner,
} from "@/lib/plans/trial";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { getOnboardingSetupStatus } from "@/lib/onboarding/setup-status";
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
import { fetchActiveSubscriptionPaymentMethods } from "@/lib/plans/get-subscription-pago-movil";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";
import { buildPlanPricingTiers } from "@/lib/plans/plan-settings";
import { getOpenPromoOffersForUser } from "@/lib/plans/subscription-promo";
import {
  isBillingPeriod,
  resolvePeriodEndsAtFromStart,
} from "@/lib/plans/proration";
import {
  normalizeDbPlan,
} from "@/lib/plans/plan-activation";
import { getPendingPlanSummary } from "@/lib/plans/pending-plan";
import { formatPlanLabel } from "@/src/config/plans";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/planes");
  }

  const { authUser, store } = session;
  const trial = resolveProTrialStatus(authUser.profile);
  const showProTrialBanner = shouldShowProTrialBanner(authUser.profile);
  const currentBillingPeriod =
    authUser.profile?.billing_period &&
    isBillingPeriod(authUser.profile.billing_period)
      ? authUser.profile.billing_period
      : "monthly";
  const subscriptionPeriodEndsAt = resolvePeriodEndsAtFromStart(
    authUser.profile?.subscription_period_started_at,
    currentBillingPeriod,
    authUser.profile?.subscription_period_ends_at,
  );
  const pendingSummary = getPendingPlanSummary(authUser.profile);
  const pendingPlanName = pendingSummary
    ? formatPlanLabel(normalizeDbPlan(pendingSummary.pendingPlan))
    : null;
  const [
    productLimitContext,
    exchangeRateRow,
    paymentReview,
    permanentRejection,
    paymentMethods,
    planSettings,
    promoOffers,
    platformSettings,
    storeSettings,
  ] = await Promise.all([
      store ? getStoreProductLimitContext(store.id) : Promise.resolve(null),
      getCurrentExchangeRate(),
      getUserPaymentReview(authUser.id),
      getLatestPermanentRejection(authUser.id),
      fetchActiveSubscriptionPaymentMethods(),
      fetchPlanSettings(),
      getOpenPromoOffersForUser(authUser.id),
      fetchPlatformSettings(),
      store ? getStoreSettingsConfig(store.id) : Promise.resolve(null),
    ]);
  const exchangeRate = exchangeRateRow?.rate ?? null;
  const pricingTiers = buildPlanPricingTiers(planSettings);
  const trialSetupStatus =
    store && storeSettings
      ? getOnboardingSetupStatus(
          productLimitContext?.currentCount ?? 0,
          storeSettings,
          store.slug,
        )
      : {
          hasProducts: false,
          hasMinProductsForProTrial: false,
          hasPaymentsConfigured: false,
          hasShippingConfigured: false,
        };

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

      {platformSettings.plansCouponBoxEnabled ? (
        <div className="mb-8 max-w-2xl">
          <SubscriptionCouponRedeemCard />
        </div>
      ) : null}

      {store && showProTrialBanner ? (
        <div className="mb-8 max-w-3xl">
          <ProTrialBanner
            showBanner
            trialEligible={trial.eligible}
            trialActive={trial.benefitsActive}
            trialEndsAt={trial.endsAt}
            setupStatus={trialSetupStatus}
            proProductLimit={
              productLimitContext?.productLimit ?? planSettings.PRO.productLimit
            }
          />
        </div>
      ) : null}

      <PlansPanel
        currentPlanId={authUser.planId}
        currentPlanName={authUser.plan.name}
        productCount={productLimitContext?.currentCount ?? null}
        productLimit={productLimitContext?.productLimit ?? null}
        exchangeRate={exchangeRate}
        trialActive={trial.benefitsActive}
        trialEndsAt={trial.endsAt}
        subscriptionStatus={authUser.profile?.subscription_status ?? "none"}
        subscriptionPeriodStartedAt={
          authUser.profile?.subscription_period_started_at ?? null
        }
        subscriptionPeriodEndsAt={subscriptionPeriodEndsAt}
        currentBillingPeriod={currentBillingPeriod}
        paymentMethods={paymentMethods}
        pricingTiers={pricingTiers}
        showCouponField={platformSettings.plansCouponBoxEnabled}
        pendingPlanName={pendingPlanName}
        pendingPlanEffectiveAt={pendingSummary?.effectiveAt ?? null}
      />
    </PageContainer>
  );
}
