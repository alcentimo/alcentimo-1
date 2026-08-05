import { cn } from "@/lib/cn";
import { LandingBoutiqueLunaSandbox } from "@/components/landing/LandingBoutiqueLunaSandbox";

interface HeroCompositeMockupProps {
  className?: string;
  exchangeRate?: number | null;
}

/** Sandbox interactivo del catálogo (Boutique Luna) para el hero y demos. */
export function HeroCompositeMockup({
  className,
  exchangeRate = null,
}: HeroCompositeMockupProps) {
  return (
    <LandingBoutiqueLunaSandbox
      className={cn(className)}
      exchangeRate={exchangeRate}
    />
  );
}
