import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";
import { Hero } from "@/components/landing/Hero";
import { LandingCustomerExperience } from "@/components/landing/LandingCustomerExperience";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingWhiteLabel } from "@/components/landing/LandingWhiteLabel";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingAssistantChat } from "@/components/landing/LandingAssistantChat";
import { fetchPlanPricingTiers } from "@/lib/plans/get-plan-settings";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { withTimeoutFallback } from "@/lib/async/with-timeout-fallback";

/** Precios de planes cambian poco; cachear acelera TTFB de la landing. */
export const revalidate = 300;

export default async function Home() {
  const [pricingTiers, exchangeRateRow] = await Promise.all([
    fetchPlanPricingTiers(),
    withTimeoutFallback(
      getCurrentExchangeRate(),
      4_000,
      null,
      "landing:getCurrentExchangeRate",
    ),
  ]);

  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <RecoveryUrlRedirect />

      <LandingNav />

      <main className="landing-shell">
        <Hero exchangeRate={exchangeRateRow?.rate ?? null} />
        <LandingCustomerExperience />
        <LandingBenefits />
        <LandingWhiteLabel />
        <LandingPricing pricingTiers={pricingTiers} />
        <LandingCta />
      </main>

      <LandingFooter />
      <LandingAssistantChat />
    </>
  );
}
