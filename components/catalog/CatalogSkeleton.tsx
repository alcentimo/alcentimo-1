import { PageContainer } from "@/components/ui/PageContainer";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-200 ${className ?? ""}`} />
  );
}

function ProductCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <SkeletonBlock className="aspect-[4/5] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-6">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="mt-4 h-7 w-24" />
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
