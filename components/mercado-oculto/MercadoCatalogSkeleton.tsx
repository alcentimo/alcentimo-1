export function MercadoCatalogSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const count = compact ? 4 : 8;
  return (
    <div
      className={
        compact
          ? "mercado-mp-skeleton-overlay"
          : "mercado-mp-skeleton"
      }
      aria-hidden={compact ? true : undefined}
      role={compact ? undefined : "status"}
      aria-label={compact ? undefined : "Cargando productos"}
    >
      {!compact ? (
        <ul className="mercado-mp-grid">
          {Array.from({ length: count }).map((_, index) => (
            <li key={index} className="mercado-mp-skeleton-card">
              <div className="mercado-mp-skeleton-media" />
              <div className="mercado-mp-skeleton-line w-4/5" />
              <div className="mercado-mp-skeleton-line w-2/5" />
              <div className="mercado-mp-skeleton-line w-3/5" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
