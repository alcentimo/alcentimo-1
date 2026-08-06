import { cn } from "@/lib/cn";
import { HeroCatalogStaticPreview } from "@/components/landing/HeroCatalogStaticPreview";

interface HeroCompositeMockupProps {
  className?: string;
  /** @deprecated Ya no se usa: la vista previa es estática. */
  exchangeRate?: number | null;
}

/** Vista previa estática del catálogo para el hero y demos ligeras. */
export function HeroCompositeMockup({
  className,
}: HeroCompositeMockupProps) {
  return <HeroCatalogStaticPreview className={cn(className)} />;
}
