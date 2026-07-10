import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreProductLimitStatus } from "@/lib/plans/product-limit";
import { PlansPanel } from "@/components/dashboard/PlansPanel";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function PlanesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/planes");
  }

  const { authUser, store } = session;
  const productLimitStatus = store
    ? await getStoreProductLimitStatus(store.id)
    : null;

  return (
    <PageContainer as="div" className="mx-auto max-w-4xl py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Suscripción</p>
        <h1 className="page-header-title">Planes</h1>
        <p className="page-header-desc">
          Consulta tu plan actual y compara las opciones disponibles para tu
          tienda{store ? ` · ${store.name}` : ""}.
        </p>
      </header>

      <PlansPanel
        currentPlanId={authUser.planId}
        currentPlanName={
          authUser.planId === "free" ? "Gratis" : authUser.plan.name
        }
        productCount={productLimitStatus?.currentCount ?? null}
        productLimit={productLimitStatus?.productLimit ?? null}
      />
    </PageContainer>
  );
}
