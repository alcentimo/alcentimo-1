import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getBusinessUpgradePreview } from "@/lib/plans/get-business-upgrade-preview";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { UpgradeToBusinessPanel } from "@/components/dashboard/plans/UpgradeToBusinessPanel";
import { PageContainer } from "@/components/ui/PageContainer";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import { fetchSubscriptionPagoMovilDetails } from "@/lib/plans/get-subscription-pago-movil";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/upgrade");
  }

  const { authUser } = session;
  const dbPlan = normalizeDbPlan(authUser.profile?.plan ?? authUser.rawPlan);
  const preview = await getBusinessUpgradePreview(authUser.id, "monthly");

  // Solo PRO (o quien ya tenga un upgrade pending de Business).
  if (dbPlan !== "PRO" && !preview.pendingPayment) {
    redirect(`${DASHBOARD_PLANS_HREF}?upgrade=pro_only`);
  }

  const exchangeRateRow = await getCurrentExchangeRate();
  const pagoMovil = await fetchSubscriptionPagoMovilDetails();

  return (
    <PageContainer as="div" className="mx-auto max-w-4xl py-6 sm:py-8">
      <header className="mb-8 space-y-2">
        <Link
          href={DASHBOARD_PLANS_HREF}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Volver a planes
        </Link>
        <p className="section-label">Upgrade</p>
        <h1 className="page-header-title">Pasar a Business</h1>
        <p className="page-header-desc">
          Usa el saldo de tus días Pro no consumidos y paga solo la diferencia
          para activar Business.
        </p>
      </header>

      <UpgradeToBusinessPanel
        preview={preview}
        exchangeRate={exchangeRateRow?.rate ?? null}
        pagoMovil={pagoMovil}
      />
    </PageContainer>
  );
}
