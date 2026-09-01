import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StorefrontHeroStageProps {
  children: ReactNode;
  className?: string;
}

/**
 * Escenario de banners bajo la cabecera: portada + carrusel promocional
 * (ambos se activan desde Ajustes → Diseño).
 */
export function StorefrontHeroStage({
  children,
  className,
}: StorefrontHeroStageProps) {
  return (
    <section
      className={cn("storefront-hero-stage", className)}
      aria-label="Promociones de la tienda"
    >
      {children}
    </section>
  );
}
