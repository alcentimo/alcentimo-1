import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { getMercadoProduct } from "@/lib/mercado-oculto/product-actions";
import { MercadoChatPanel } from "@/components/mercado-oculto/MercadoChatPanel";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MercadoProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/mercado-oculto");
  }
  if (!hasMercadoOcultoSuperAdminUser(user)) {
    notFound();
  }

  const authUser = await getAuthUserWithPlan(supabase);
  if (!authUser) {
    redirect("/dashboard/login?next=/mercado-oculto");
  }

  const { productId } = await params;
  const search = await searchParams;
  const conversationRaw = Array.isArray(search.c) ? search.c[0] : search.c;
  const conversationId = conversationRaw?.trim() || null;

  const result = await getMercadoProduct(productId);

  if (result.error === "Producto no encontrado o inactivo.") {
    notFound();
  }

  if (result.error || !result.product || !result.sellerUserId) {
    return (
      <div className="space-y-4">
        <Link href="/mercado-oculto" className="mercado-back-link">
          ← Volver a la vitrina
        </Link>
        <p className="mercado-alert" role="alert">
          {result.error ?? "No se pudo cargar el producto."}
        </p>
      </div>
    );
  }

  const product = result.product;
  const isOwnProduct = result.sellerUserId === authUser.id;

  return (
    <div className="space-y-6">
      <Link href="/mercado-oculto" className="mercado-back-link">
        ← Volver a la vitrina
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="mercado-detail-card">
          <div className="mercado-detail-media">
            {product.thumb_url ? (
              <Image
                src={product.thumb_url}
                alt={product.product_name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
                unoptimized
              />
            ) : (
              <div
                className="mercado-card-media-fallback text-3xl"
                aria-hidden="true"
              >
                {product.product_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2 p-4 sm:p-5">
            <p className="mercado-card-store">
              {result.sellerStoreName || product.store_name}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {product.product_name}
            </h1>
            {product.category_name ? (
              <p className="text-sm text-zinc-500">{product.category_name}</p>
            ) : null}
            {product.short_description ? (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {product.short_description}
              </p>
            ) : null}
            <p className="pt-1 text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-300">
              {formatUsd(product.price_usd)}
            </p>
            <p className="text-xs text-zinc-500">
              Stock: {product.available_stock} · Costo base mayorista
            </p>
          </div>
        </section>

        <MercadoChatPanel
          productId={product.product_id}
          currentUserId={authUser.id}
          isOwnProduct={isOwnProduct}
          accessMode="subscriber"
          initialConversationId={conversationId}
        />
      </div>
    </div>
  );
}
