import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

/** Ruta legacy: el catálogo público vive en `/c/[slug]` (vitrina Moriche). */
export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  permanentRedirect(`/c/${slug}`);
}
