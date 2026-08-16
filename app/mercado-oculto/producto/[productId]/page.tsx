import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BadgeCheck, Boxes, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { getMercadoProduct } from "@/lib/mercado-oculto/product-actions";
import { MercadoChatPanel } from "@/components/mercado-oculto/MercadoChatPanel";
import { MercadoProductBuyBox } from "@/components/mercado-oculto/MercadoProductBuyBox";
import { MercadoSellerQuestions } from "@/components/mercado-oculto/MercadoSellerQuestions";
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
      <nav className="mercado-ml-breadcrumb" aria-label="Navegación">
        <Link href="/mercado-oculto">Catálogo</Link>
        <span aria-hidden="true">›</span>
        <span>{product.category_name}</span>
        <span aria-hidden="true">›</span>
        <span className="truncate">{product.product_name}</span>
      </nav>

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
            {product.supplier_label}
          </div>
          <p className="mercado-mp-card-meta mt-3">
            {product.category_name} · {product.supplier_label}
          </p>
          <h1 className="mercado-mp-detail-title">{product.product_name}</h1>

          <div className="mercado-mp-detail-stock">
            <Boxes className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>
              Stock disponible:{" "}
              <strong className="tabular-nums text-zinc-900">
                {product.available_stock}
              </strong>
            </span>
          </div>

          <MercadoProductBuyBox
            productId={product.product_id}
            productName={product.product_name}
            priceUsd={product.price_usd}
            compareAtUsd={product.compare_at_usd}
            discountPercent={product.discount_percent}
            freeShipping={product.free_shipping}
            availableStock={product.available_stock}
            thumbUrl={product.thumb_url}
            supplierUserId={product.seller_user_id}
            supplierLabel={product.supplier_label}
          />

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

          <a href="#preguntas" className="mercado-mp-detail-cta-secondary">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Preguntar al vendedor
          </a>
        </section>
      </div>

      {product.short_description ? (
        <div className="mercado-mp-detail-block mercado-ml-description">
          <h2>Descripción</h2>
          <p>{product.short_description}</p>
        </div>
      ) : null}

      <div id="preguntas" className="scroll-mt-28">
        <MercadoSellerQuestions
          productId={product.product_id}
          productName={product.product_name}
          supplierLabel={product.supplier_label}
        />
      </div>

      <div id="negociar" className="mercado-mp-detail-chat">
        <h2 className="mercado-ml-chat-heading">Chat / negociación directa</h2>
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
