import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";
import { Hero } from "@/components/landing/Hero";
import { LandingCustomerExperience } from "@/components/landing/LandingCustomerExperience";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { fetchPlanPricingTiers } from "@/lib/plans/get-plan-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const pricingTiers = await fetchPlanPricingTiers();

  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <RecoveryUrlRedirect />

      <LandingNav />

      <main className="landing-shell">
        <Hero />
        <LandingCustomerExperience />
        <LandingBenefits />
        <LandingPricing pricingTiers={pricingTiers} />
        <LandingCta />
      </main>

      <LandingFooter />
    </>
  );
}
