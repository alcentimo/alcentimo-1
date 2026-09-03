import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";
import { Hero } from "@/components/landing/Hero";
import { LandingAudiencePaths } from "@/components/landing/LandingAudiencePaths";
import { LandingCustomerExperience } from "@/components/landing/LandingCustomerExperience";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingWhiteLabel } from "@/components/landing/LandingWhiteLabel";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingAssistantChat } from "@/components/landing/LandingAssistantChat";
import { LandingVisitTracker } from "@/components/landing/LandingVisitTracker";

export const revalidate = 300;

export default async function Home() {
  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <RecoveryUrlRedirect />
      <LandingVisitTracker />

      <LandingNav />

      <main className="landing-shell">
        <Hero />
        <LandingAudiencePaths />
        <LandingCustomerExperience />
        <LandingBenefits />
        <LandingWhiteLabel />
        <LandingCta />
      </main>

      <LandingFooter />
      <LandingAssistantChat />
    </>
  );
}
