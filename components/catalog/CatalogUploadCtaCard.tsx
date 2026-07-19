import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface CatalogUploadCtaCardProps {
  href?: string;
  className?: string;
}

export function CatalogUploadCtaCard({
  href = "/dashboard/productos/nuevo",
  className,
}: CatalogUploadCtaCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "catalog-upload-cta-card store-product-card group h-full",
        className,
      )}
    >
      <div className="catalog-upload-cta-card-inner">
        <span className="catalog-upload-cta-icon" aria-hidden="true">
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <p className="catalog-upload-cta-title">Sube tu primer producto real</p>
        <p className="catalog-upload-cta-desc">
          Reemplaza estos ejemplos con fotos, precios y descripciones de tu
          inventario.
        </p>
        <span className="catalog-upload-cta-action">
          Crear producto
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
