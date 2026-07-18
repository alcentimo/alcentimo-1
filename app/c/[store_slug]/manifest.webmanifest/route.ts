import { getPublicStoreBySlug } from "@/lib/stores";
import { getSiteUrl } from "@/lib/site-url";

interface CatalogManifestRouteProps {
  params: Promise<{ store_slug: string }>;
}

export async function GET(_request: Request, { params }: CatalogManifestRouteProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = getSiteUrl();
  const startUrl = `${siteUrl}/c/${store.slug}`;
  const scope = `${siteUrl}/c/${store.slug}`;

  const icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }> = [];

  if (store.pwa_icon_192_url) {
    icons.push({
      src: store.pwa_icon_192_url,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    });
  }

  if (store.pwa_icon_512_url) {
    icons.push(
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    );
  }

  if (icons.length === 0 && store.logo_url) {
    icons.push({
      src: store.logo_url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    });
  }

  const manifest = {
    name: store.name,
    short_name: store.name.slice(0, 12),
    description: `Catálogo y pedidos de ${store.name}`,
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons,
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
