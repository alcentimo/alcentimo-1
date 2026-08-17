import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Boxes, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { MORICHE_BRAND_LABEL } from "@/lib/mercado-oculto/access";
import { getMercadoProduct } from "@/lib/mercado-oculto/product-actions";
import { MercadoChatPanel } from "@/components/mercado-oculto/MercadoChatPanel";
import { MercadoProductBuyBox } from "@/components/mercado-oculto/MercadoProductBuyBox";
import { MercadoProductGallery } from "@/components/mercado-oculto/MercadoProductGallery";
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
  const authUser = await getAuthUserWithPlan(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user ?? authUser);

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
  const brandLabel = MORICHE_BRAND_LABEL;
  const isOwnProduct = Boolean(
    authUser && result.sellerUserId === authUser.id,
  );
  const variantAttr = supplierVariantAttributeLabel(product.variants);
  const chatAccessMode = isAuthenticated ? "subscriber" : "anonymous";

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
        <MercadoProductGallery
          productName={product.product_name}
          imageUrls={
            (product.gallery_urls?.length ?? 0) > 0
              ? product.gallery_urls
              : product.thumb_url
                ? [product.thumb_url]
                : []
          }
        />

        <section className="mercado-mp-detail-info">
          <div className="mercado-mp-official-pill">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {brandLabel}
          </div>
          <p className="mercado-mp-card-meta mt-3">
            {product.category_name} · Vendido por {brandLabel}
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
            supplierLabel={brandLabel}
            isAuthenticated={isAuthenticated}
          />

          {product.variants.options.length > 0 ? (
            <div className="mercado-mp-detail-block">
              <h2>Especificaciones</h2>
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
            Preguntar a {brandLabel}
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
          supplierLabel={brandLabel}
        />
      </div>

      <div id="negociar" className="mercado-mp-detail-chat">
        <h2 className="mercado-ml-chat-heading">Chat / negociación con {brandLabel}</h2>
        <MercadoChatPanel
          productId={product.product_id}
          currentUserId={authUser?.id ?? null}
          isOwnProduct={isOwnProduct}
          accessMode={chatAccessMode}
          initialConversationId={conversationId}
        />
      </div>
    </div>
  );
}
