import Image from "next/image";
import Link from "next/link";
import { formatUsd } from "@/lib/format";
import {
  supplierPublicCatalogPath,
  supplierPublicCatalogProductPath,
  type SupplierPublicCatalogProfile,
} from "@/lib/catalog/supplier-public-catalog";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

export function SupplierPublicCatalogView({
  profile,
  products,
}: {
  profile: SupplierPublicCatalogProfile;
  products: MercadoProductCard[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Vitrina pública
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {profile.companyName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Catálogo exclusivo de este proveedor.
        </p>
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
  const image =
    product.gallery_urls[0] ?? product.thumb_url ?? null;
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
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {product.product_name}
          </h1>
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
