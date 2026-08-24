import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierPublicCatalogView } from "@/components/catalog/SupplierPublicCatalogView";
import { getSupplierPublicCatalogBySlug } from "@/lib/catalog/supplier-public-catalog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getSupplierPublicCatalogBySlug(slug);
  if (!catalog) {
    return { title: "Vitrina no disponible" };
  }
  return {
    title: `${catalog.profile.companyName} · Vitrina pública`,
    description: `Catálogo público de ${catalog.profile.companyName}.`,
  };
}

export default async function SupplierPublicCatalogPage({ params }: PageProps) {
  const { slug } = await params;
  const catalog = await getSupplierPublicCatalogBySlug(slug);
  if (!catalog) notFound();

  return (
    <SupplierPublicCatalogView
      profile={catalog.profile}
      products={catalog.products}
    />
  );
}
