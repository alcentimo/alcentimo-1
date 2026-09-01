interface StorefrontCoverBannerProps {
  url: string | null;
  storeName: string;
}

/** Portada configurada en Diseño → Banner (hero de impacto). */
export function StorefrontCoverBanner({
  url,
  storeName,
}: StorefrontCoverBannerProps) {
  if (!url) return null;

  return (
    <div className="storefront-hero-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Banner de ${storeName}`}
        className="storefront-hero-cover-img"
      />
    </div>
  );
}
