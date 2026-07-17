import { PageContainer } from "@/components/ui/PageContainer";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-200 ${className ?? ""}`} />
  );
}

function ProductCardSkeleton() {
  return (
    <article className="store-product-card h-full">
      <SkeletonBlock className="store-product-media aspect-[4/5] w-full shrink-0 rounded-none" />
      <div className="store-product-content">
        <div className="store-product-body">
          <SkeletonBlock className="store-product-slot-meta h-[var(--pc-meta-min-h)] w-16" />
          <SkeletonBlock className="store-product-slot-title h-[var(--pc-title-min-h)] w-full" />
          <SkeletonBlock className="store-product-slot-desc h-[var(--pc-desc-min-h)] w-3/4" />
          <SkeletonBlock className="store-product-slot-variant h-[var(--pc-variant-min-h)] w-full" />
          <div aria-hidden="true" />
          <SkeletonBlock className="store-product-slot-pricing h-[var(--pc-price-min-h)] w-24" />
        </div>
        <div className="store-product-footer sm:hidden">
          <SkeletonBlock className="store-product-footer-placeholder h-[var(--pc-btn-min-h)] w-full" />
        </div>
      </div>
    </article>
  );
}

export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="store-catalog-shell">
      <div className="store-banner">
        <SkeletonBlock className="mx-auto h-3 w-32 bg-zinc-200" />
      </div>

      <header className="store-header">
        <div className="store-header-inner">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-11 w-11 rounded-full" />
            <SkeletonBlock className="h-5 w-36" />
          </div>
          <SkeletonBlock className="h-11 w-11 rounded-full" />
        </div>
      </header>

      <PageContainer className="store-catalog-main">
        <div className="store-toolbar">
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl lg:w-56" />
        </div>

        <div className="store-catalog-layout">
          <div className="store-product-grid">
            {Array.from({ length: count }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
          <SkeletonBlock className="hidden h-96 rounded-2xl xl:block" />
        </div>
      </PageContainer>
    </div>
  );
}
