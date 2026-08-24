import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierPublicCatalogProductView } from "@/components/catalog/SupplierPublicCatalogView";
import { getSupplierPublicCatalogProduct } from "@/lib/catalog/supplier-public-catalog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, productId } = await params;
  const data = await getSupplierPublicCatalogProduct({ slug, productId });
  if (!data) {
    return { title: "Producto no disponible" };
  }
  return {
    title: `${data.product.product_name} · ${data.profile.companyName}`,
  };
}

export default async function SupplierPublicCatalogProductPage({
  params,
}: PageProps) {
  const { slug, productId } = await params;
  const data = await getSupplierPublicCatalogProduct({ slug, productId });
  if (!data) notFound();

  return (
    <SupplierPublicCatalogProductView
      profile={data.profile}
      product={data.product}
    />
  );
}
