import { supabase } from "@/lib/supabase";
import { getCurrentExchangeRate } from "@/lib/catalog";
import type { Store } from "@/lib/database.types";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { FinancialConsistencyHighlight } from "@/components/landing/FinancialConsistencyHighlight";
import { Features } from "@/components/landing/Features";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { PricingGrid } from "@/components/landing/PricingGrid";
import { StoreDirectory } from "@/components/landing/StoreDirectory";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";

export const dynamic = "force-dynamic";

type StoreListItem = Pick<Store, "name" | "slug" | "description">;

export default async function Home() {
  const [{ data }, exchangeRateRow] = await Promise.all([
    supabase
      .from("stores")
      .select("name, slug, description")
      .eq("is_active", true)
      .order("name"),
    getCurrentExchangeRate(),
  ]);

  const stores = (data ?? []) as StoreListItem[];
  const exchangeRate = exchangeRateRow?.rate ?? null;

  return (
    <>
      <RecoveryUrlRedirect />
      <LandingNav />
      <main className="landing-shell">
        <Hero exchangeRate={exchangeRate} />
        <FinancialConsistencyHighlight />
        <Features />
        <IntegrationsSection />
        <PricingGrid exchangeRate={exchangeRate} />
        <StoreDirectory stores={stores} />
        <CtaBanner />
      </main>
      <LandingFooter />
    </>
  );
}
