"use client";

import { useMemo } from "react";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { getBoutiqueLunaDemoBundle } from "@/lib/landing/boutique-luna-demo";
import { cn } from "@/lib/cn";

interface LandingBoutiqueLunaSandboxProps {
  className?: string;
  exchangeRate?: number | null;
}

/**
 * Sandbox interactivo del catálogo público real (Boutique Luna) para la landing.
 * Misma UI que la vista previa del dashboard, con carrito, Ayuda y WhatsApp.
 */
export function LandingBoutiqueLunaSandbox({
  className,
  exchangeRate = null,
}: LandingBoutiqueLunaSandboxProps) {
  const demo = useMemo(
    () => getBoutiqueLunaDemoBundle(exchangeRate),
    [exchangeRate],
  );

  return (
    <div className={cn("landing-catalog-sandbox", className)}>
      <div className="landing-catalog-sandbox-frame">
        <div className="landing-catalog-sandbox-chrome" aria-hidden="true">
          <span className="landing-dashboard-mockup-dot bg-red-400/90" />
          <span className="landing-dashboard-mockup-dot bg-amber-400/90" />
          <span className="landing-dashboard-mockup-dot bg-emerald-400/90" />
          <span className="landing-catalog-sandbox-url">
            boutique-luna.alcentimo.com
          </span>
        </div>

        <div className="landing-catalog-sandbox-stage">
          <CatalogLivePreview
            store={demo.store}
            products={demo.products}
            exchangeRate={exchangeRate}
            settings={demo.settings}
            interactive
            assistantEnabled
            assistantDemoMode
            whatsappPhone={demo.whatsappPhone}
          />
        </div>
      </div>

      <p className="landing-catalog-sandbox-caption">
        Prueba el catálogo real: agrega al carrito, abre Ayuda o escribe por
        WhatsApp
      </p>
    </div>
  );
}
