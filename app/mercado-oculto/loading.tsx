import { MercadoCatalogSkeleton } from "@/components/mercado-oculto/MercadoCatalogSkeleton";

export default function MercadoOcultoLoading() {
  return (
    <div className="mercado-mp-layout">
      <aside className="mercado-mp-filters" aria-hidden>
        <div className="mercado-mp-skeleton-line w-1/2 mb-3" />
        <div className="mercado-mp-skeleton-line w-full mb-2" />
        <div className="mercado-mp-skeleton-line w-full mb-2" />
        <div className="mercado-mp-skeleton-line w-3/4" />
      </aside>
      <div className="mercado-mp-results">
        <div className="mercado-mp-results-head">
          <div className="mercado-mp-skeleton-line w-48 h-6" />
          <div className="mercado-mp-skeleton-line w-20" />
        </div>
        <MercadoCatalogSkeleton />
      </div>
    </div>
  );
}
