import { cn } from "@/lib/cn";
import { LandingFashionCatalogMockup } from "@/components/landing/LandingFashionCatalogMockup";

interface HeroCompositeMockupProps {
  className?: string;
  exchangeRate?: number | null;
}

/** Vista previa estática del catálogo (moda) usada en el hero y demos. */
export function HeroCompositeMockup({
  className,
  exchangeRate = null,
}: HeroCompositeMockupProps) {
  return (
    <LandingFashionCatalogMockup
      className={cn(className)}
      exchangeRate={exchangeRate}
    />
  );
}
