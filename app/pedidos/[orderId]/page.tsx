import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOrderForStore } from "@/lib/orders/get-order-for-store";
import { PublicOrderDetailPanel } from "@/components/orders/PublicOrderDetailPanel";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

interface PublicOrderPageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({
  params,
}: PublicOrderPageProps): Promise<Metadata> {
  const { orderId } = await params;
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const pageUrl = `${siteUrl}/pedidos/${orderId}`;

  return {
    title: "Pedido · Alcentimo",
    description: "Revisa el comprobante y gestiona el pedido en Alcentimo.",
    openGraph: {
      title: "Nuevo pedido · Alcentimo",
      description: "Gestiona tu venta desde la plataforma.",
      siteName: "Alcentimo",
      type: "website",
      url: pageUrl,
      images: [
        {
          url: `${siteUrl}/icon-512x512.png`,
          width: 512,
          height: 512,
          alt: "Alcentimo",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: "Nuevo pedido · Alcentimo",
      description: "Gestiona tu venta desde la plataforma.",
      images: [`${siteUrl}/icon-512x512.png`],
    },
    robots: { index: false, follow: false },
  };
}

export default async function PublicOrderPage({ params }: PublicOrderPageProps) {
  const { orderId } = await params;
  const supabase = await createClient();
  const session = await getDashboardSession();

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
