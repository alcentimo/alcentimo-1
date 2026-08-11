import { cn } from "@/lib/cn";
import { HeroCatalogStaticPreview } from "@/components/landing/HeroCatalogStaticPreview";

interface HeroCompositeMockupProps {
  className?: string;
  /** Tasa BCV vigente para la vista previa. */
  exchangeRate?: number | null;
}

/** Vista previa estática del catálogo para el hero y demos ligeras. */
export function HeroCompositeMockup({
  className,
  exchangeRate = null,
}: HeroCompositeMockupProps) {
  return (
    <HeroCatalogStaticPreview
      className={cn(className)}
      exchangeRate={exchangeRate}
    />
  );
}
