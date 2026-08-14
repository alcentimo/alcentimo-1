import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, Boxes, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { getMercadoProduct } from "@/lib/mercado-oculto/product-actions";
import { MercadoChatPanel } from "@/components/mercado-oculto/MercadoChatPanel";
import { formatUsd } from "@/lib/format";
import { supplierVariantAttributeLabel } from "@/lib/supplier/variants";

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
          ← Volver al catálogo
        </Link>
        <p className="mercado-alert" role="alert">
          {result.error ?? "No se pudo cargar el producto."}
        </p>
      </div>
    );
  }

  const product = result.product;
  const isOwnProduct = result.sellerUserId === authUser.id;
  const variantAttr = supplierVariantAttributeLabel(product.variants);

  return (
    <div className="mercado-mp-detail">
      <Link href="/mercado-oculto" className="mercado-back-link">
        ← Volver al catálogo
      </Link>

      <div className="mercado-mp-detail-grid">
        <section className="mercado-mp-detail-gallery">
          <div className="mercado-mp-detail-hero">
            {product.thumb_url ? (
              <Image
                src={product.thumb_url}
                alt={product.product_name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 560px"
                unoptimized
                priority
              />
            ) : (
              <div
                className="mercado-card-media-fallback text-4xl"
                aria-hidden="true"
              >
                {product.product_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          {product.thumb_url ? (
            <div className="mercado-mp-detail-thumbs">
              <div className="mercado-mp-detail-thumb mercado-mp-detail-thumb-active">
                <Image
                  src={product.thumb_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="72px"
                  unoptimized
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="mercado-mp-detail-info">
          <div className="mercado-mp-official-pill">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            Mayorista Oficial Alcéntimo
          </div>
          <p className="mercado-mp-card-meta mt-3">
            {product.category_name} · {product.supplier_label}
          </p>
          <h1 className="mercado-mp-detail-title">{product.product_name}</h1>
          <p className="mercado-mp-detail-price">{formatUsd(product.price_usd)}</p>
          <p className="text-sm text-zinc-500">Precio mayorista (costo base)</p>

          <div className="mercado-mp-detail-stock">
            <Boxes className="h-4 w-4 text-teal-700" aria-hidden="true" />
            <span>
              Stock disponible:{" "}
              <strong className="tabular-nums text-zinc-900 dark:text-zinc-50">
                {product.available_stock}
              </strong>
            </span>
          </div>

          {product.short_description ? (
            <div className="mercado-mp-detail-block">
              <h2>Descripción</h2>
              <p>{product.short_description}</p>
            </div>
          ) : null}

          {product.variants.options.length > 0 ? (
            <div className="mercado-mp-detail-block">
              <h2>Especificaciones del mayorista</h2>
              <dl className="mercado-mp-specs">
                {variantAttr ? (
                  <div>
                    <dt>Atributo</dt>
                    <dd>{variantAttr}</dd>
                  </div>
                ) : null}
                {product.variants.options.map((option) => (
                  <div key={option.label}>
                    <dt>{option.label}</dt>
                    <dd>
                      {(option.priceExtraUsd ?? 0) > 0
                        ? `+ ${formatUsd(option.priceExtraUsd ?? 0)}`
                        : "Incluido"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <a href="#negociar" className="mercado-mp-detail-cta">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Iniciar chat / negociación
          </a>
        </section>
      </div>

      <div id="negociar" className="mercado-mp-detail-chat">
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
