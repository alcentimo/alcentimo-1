import { getCurrentExchangeRate } from "@/lib/catalog";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";

export const dynamic = "force-dynamic";

export default async function Home() {
  const exchangeRateRow = await getCurrentExchangeRate();
  const exchangeRate = exchangeRateRow?.rate ?? null;

  return (
    <>
      <RecoveryUrlRedirect />
      <LandingNav />
      <main className="landing-shell">
        <Hero />
        <Features />
        <IntegrationsSection />
        <LandingPricing exchangeRate={exchangeRate} />
      </main>
      <LandingFooter />
    </>
  );
}
