import Image from "next/image";
import Link from "next/link";
import { CatalogProductShareMenu } from "@/components/catalog/CatalogProductShareMenu";
import { formatUsd } from "@/lib/format";
import {
  supplierPublicCatalogPath,
  supplierPublicCatalogProductPath,
  type SupplierPublicCatalogProfile,
} from "@/lib/catalog/supplier-public-catalog";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { getShippingMethod } from "@/src/config/shipping-methods";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";

function enabledPaymentLabels(profile: SupplierPublicCatalogProfile): string[] {
  return (Object.entries(profile.payments.methods) as Array<
    [PaymentMethodKey, { enabled: boolean }]
  >)
    .filter(([, method]) => method.enabled)
    .map(([key]) => getPaymentMethod(key).label);
}

function enabledShippingLabels(profile: SupplierPublicCatalogProfile): string[] {
  return (Object.entries(profile.shipping.carriers) as Array<
    [ShippingCarrierKey, boolean]
  >)
    .filter(([, enabled]) => enabled)
    .map(([key]) => getShippingMethod(key).label);
}

export function SupplierPublicCatalogView({
  profile,
  products,
}: {
  profile: SupplierPublicCatalogProfile;
  products: MercadoProductCard[];
}) {
  const payments = enabledPaymentLabels(profile);
  const shipping = enabledShippingLabels(profile);
  const initials = profile.companyName.trim().slice(0, 1).toUpperCase() || "P";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-lg font-semibold text-zinc-400">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Vitrina pública
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {profile.companyName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {profile.description ||
                "Catálogo exclusivo de este proveedor."}
            </p>
          </div>
        </div>
      </header>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Este proveedor aún no tiene productos visibles.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.product_id}>
              <Link
                href={supplierPublicCatalogProductPath(
                  profile.slug,
                  product.product_id,
                )}
                className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-900">
                  {product.thumb_url ? (
                    <Image
                      src={product.thumb_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : null}
                </div>
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {product.product_name}
                  </p>
                  <p className="text-xs text-zinc-500">{product.category_name}</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatUsd(product.price_usd)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {payments.length > 0 || shipping.length > 0 ? (
        <footer className="mt-10 grid gap-4 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800 sm:grid-cols-2">
          {payments.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Pagos
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {payments.join(" · ")}
              </p>
            </div>
          ) : null}
          {shipping.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Envíos
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {shipping.join(" · ")}
              </p>
              {profile.shipping.deliveryDetails.trim() ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {profile.shipping.deliveryDetails}
                </p>
              ) : null}
            </div>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}

export function SupplierPublicCatalogProductView({
  profile,
  product,
}: {
  profile: SupplierPublicCatalogProfile;
  product: MercadoProductCard;
}) {
  const image = product.gallery_urls[0] ?? product.thumb_url ?? null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={supplierPublicCatalogPath(profile.slug)}
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Volver a {profile.companyName}
      </Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {product.category_name}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {product.product_name}
            </h1>
            <CatalogProductShareMenu
              productName={product.product_name}
              shareUrl={supplierPublicCatalogProductPath(
                profile.slug,
                product.product_id,
              )}
              priceUsd={product.price_usd}
              storeName={profile.companyName}
            />
          </div>
          <p className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatUsd(product.price_usd)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {product.available_stock > 0
              ? `${product.available_stock} disponible(s)`
              : "Sin stock"}
          </p>
          {product.short_description ? (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {product.short_description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
