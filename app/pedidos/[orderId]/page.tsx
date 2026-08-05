import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOrderForStore } from "@/lib/orders/get-order-for-store";
import { PublicOrderDetailPanel } from "@/components/orders/PublicOrderDetailPanel";
import {
  buildOrderSharePublicUrl,
  getOrderShareContext,
  getOrderShareDomainInfo,
  resolveOrderShareImageUrl,
} from "@/lib/orders/order-share";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";

export const dynamic = "force-dynamic";

interface PublicOrderPageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({
  params,
}: PublicOrderPageProps): Promise<Metadata> {
  const { orderId } = await params;
  const context = await getOrderShareContext(orderId);

  if (!context) {
    return {
      title: "Pedido",
      robots: { index: false, follow: false },
    };
  }

  const domainInfo = getOrderShareDomainInfo(context.store);
  const pageUrl = buildOrderSharePublicUrl(
    context.store.slug,
    context.orderId,
    domainInfo,
  );
  const requestOrigin = await getRequestOrigin();
  const imageUrl = resolveOrderShareImageUrl(
    context.store,
    requestOrigin,
    context.shortRef,
  );
  const title = `Nuevo pedido · ${context.store.name}`;
  const description = `Pedido #${context.shortRef} en ${context.store.name}.`;

  return {
    title,
    description,
    applicationName: context.store.name,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: context.store.name,
      type: "website",
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: context.store.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
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
