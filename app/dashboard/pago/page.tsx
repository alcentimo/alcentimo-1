import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import {
  getLatestPermanentRejection,
  getUserPaymentReview,
} from "@/lib/plans/get-user-payment-review";
import { PaymentReviewPanel } from "@/components/dashboard/plans/PaymentReviewPanel";
import { PermanentRejectionNotice } from "@/components/dashboard/plans/PermanentRejectionNotice";
import { PageContainer } from "@/components/ui/PageContainer";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";

export const dynamic = "force-dynamic";

export default async function PagoStatusPage() {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/pago");
  }

  const [review, permanentRejection] = await Promise.all([
    getUserPaymentReview(session.authUser.id),
    getLatestPermanentRejection(session.authUser.id),
  ]);

  if (!review && !permanentRejection) {
    redirect(DASHBOARD_PLANS_HREF);
  }

  return (
    <PageContainer as="div" className="mx-auto max-w-2xl py-6 sm:py-8">
      <header className="mb-8 space-y-2">
        <Link
          href="/dashboard/catalogo"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Volver al catálogo
        </Link>
        <p className="section-label">Suscripción</p>
        <h1 className="page-header-title">Estado de tu pago</h1>
        <p className="page-header-desc">
          Seguimiento de tu comprobante. Aquí verás si está en revisión, si
          necesitamos una corrección, o si fue rechazado.
        </p>
      </header>

      {review ? <PaymentReviewPanel review={review} /> : null}
      {!review && permanentRejection ? (
        <PermanentRejectionNotice payment={permanentRejection} />
      ) : null}
    </PageContainer>
  );
}
