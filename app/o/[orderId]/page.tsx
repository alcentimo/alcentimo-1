import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  buildOrderSharePublicUrl,
  getOrderShareContext,
  getOrderShareDomainInfo,
  resolveOrderShareImageUrl,
} from "@/lib/orders/order-share";
import { getStoreCatalogPublicUrl, parseStoreSlugFromHost } from "@/lib/store-host";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";

export const dynamic = "force-dynamic";

interface OrderSharePageProps {
  params: Promise<{ orderId: string }>;
}

async function resolveShareHostContext() {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headerStore.get("host")?.split(":")[0]?.trim() ??
    null;
  return {
    host,
    storeSlug: host ? parseStoreSlugFromHost(host) : null,
  };
}

export async function generateMetadata({
  params,
}: OrderSharePageProps): Promise<Metadata> {
  const { orderId } = await params;
  const { host, storeSlug } = await resolveShareHostContext();
  const context = await getOrderShareContext(orderId, { host, storeSlug });

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

export default async function OrderSharePage({ params }: OrderSharePageProps) {
  const { orderId } = await params;
  const { host, storeSlug } = await resolveShareHostContext();
  const context = await getOrderShareContext(orderId, { host, storeSlug });
  if (!context) notFound();

  const domainInfo = getOrderShareDomainInfo(context.store);
  const catalogUrl = getStoreCatalogPublicUrl(
    context.store.slug,
    "/",
    domainInfo,
  );
  const imageUrl = context.store.logoUrl ?? context.store.iconUrl;

  return (
    <main className="page-shell-auth flex min-h-dvh flex-col items-center justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-zinc-100 via-white to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-sm px-4 py-10 text-center">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 px-6 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo remoto de la tienda
            <img
              src={imageUrl}
              alt={context.store.name}
              width={72}
              height={72}
              className="mx-auto h-16 w-16 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
          ) : (
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              aria-hidden="true"
            >
              {context.store.name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pedido recibido
          </p>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {context.store.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Referencia #{context.shortRef}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            La tienda ya tiene tu pedido. Si llegaste desde WhatsApp, no necesitas
            hacer nada más aquí.
          </p>

          <Link href={catalogUrl} className="btn-primary mt-6 inline-flex">
            Ver catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
