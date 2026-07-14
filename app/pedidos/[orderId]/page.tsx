import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOrderForStore } from "@/lib/orders/get-order-for-store";
import { PublicOrderDetailPanel } from "@/components/orders/PublicOrderDetailPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalle del pedido · Alcentimo",
  description: "Gestiona el pedido y revisa el comprobante de pago.",
  robots: { index: false, follow: false },
};

interface PublicOrderPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function PublicOrderPage({ params }: PublicOrderPageProps) {
  const { orderId } = await params;
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect(`/dashboard/login?next=/pedidos/${orderId}`);
  }

  const { store } = session;
  if (!store) {
    redirect(`/dashboard/login?next=/pedidos/${orderId}`);
  }

  const order = await getOrderForStore(supabase, orderId, store.id);
  if (!order) notFound();

  return <PublicOrderDetailPanel order={order} store={store} />;
}
