import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";
import { Hero } from "@/components/landing/Hero";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricing } from "@/components/landing/LandingPricing";

export default function Home() {
  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <RecoveryUrlRedirect />

      <LandingNav />

      <main className="landing-shell">
        <Hero />
        <LandingBenefits />
        <LandingPricing />
        <LandingCta />
      </main>

      <LandingFooter />
    </>
  );
}
