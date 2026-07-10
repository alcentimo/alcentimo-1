import Link from "next/link";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { formatExchangeRate } from "@/lib/format";
import { ProductCard } from "@/components/catalog/ProductCard";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface CatalogGridProps {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  storeName?: string;
  storeDescription?: string | null;
}

export function CatalogHeader({
  exchangeRate,
  productCount,
  storeName,
  storeDescription,
}: {
  exchangeRate: ExchangeRate | null;
  productCount: number;
  storeName?: string;
  storeDescription?: string | null;
}) {
  return (
    <header className="catalog-header sticky top-0 z-10 safe-area-inset">
      <PageContainer className="py-4 sm:py-5">
        <div className="flex items-start gap-4">
          <BrandLogo href="/" size="md" className="shrink-0" />
          <div className="min-w-0 flex-1 border-l border-zinc-200/80 pl-4 dark:border-zinc-800">
            <p className="section-label">Catálogo</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl lg:text-3xl dark:text-zinc-50">
              {storeName ?? "Tienda"}
            </h1>
            {storeDescription && (
              <p className="mt-2 line-clamp-3 text-base leading-relaxed text-zinc-600 lg:text-lg dark:text-zinc-400">
                {storeDescription}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {productCount} producto{productCount !== 1 ? "s" : ""}
              </span>
              {exchangeRate && (
                <span className="price-rate-badge gap-1.5 px-3 py-1">
                  Bs. {formatExchangeRate(exchangeRate.rate)} / USD
                </span>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

function EmptyCatalog() {
  return (
    <div className="card-surface flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 shadow-sm dark:bg-teal-950">
        <svg
          className="h-7 w-7 text-teal-600 dark:text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        No hay productos aún
      </h2>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
        Agrega productos desde el panel para verlos aquí.
      </p>
    </div>
  );
}

export function CatalogGrid({
  products,
  exchangeRate,
  storeName,
  storeDescription,
}: CatalogGridProps) {
  return (
    <div className="page-shell">
      <CatalogHeader
        exchangeRate={exchangeRate}
        productCount={products.length}
        storeName={storeName}
        storeDescription={storeDescription}
      />

      <PageContainer className="py-5 safe-area-inset sm:py-6 lg:py-8">
        {products.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="catalog-grid">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </PageContainer>

      <footer className="border-t border-zinc-200/80 bg-white py-6 safe-area-bottom dark:border-zinc-800 dark:bg-zinc-950">
        <PageContainer className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Catálogo digital con precios en USD y bolívares al tipo del día.
          </p>
          <Link href="/" className="link-brand text-sm">
            Creado con alcentimo
          </Link>
        </PageContainer>
      </footer>
    </div>
  );
}
