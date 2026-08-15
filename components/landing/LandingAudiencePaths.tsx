import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

/** Rutas claras para dueños de tienda y proveedores mayoristas. */
export function LandingAudiencePaths() {
  return (
    <section
      id="para-quien"
      className="border-b border-zinc-200/60 bg-white py-16 sm:py-20 dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="grid gap-12 sm:grid-cols-2 sm:gap-14 lg:gap-20">
          <div className="landing-audience-path">
            <p className="landing-audience-label">Dueños de tienda</p>
            <h2 className="landing-audience-title">
              Vende con tu marca, sin stock
            </h2>
            <p className="landing-audience-copy">
              Importa productos del catálogo, fija tu margen y comparte tu
              tienda por WhatsApp.
            </p>
            <Link
              href={MERCHANT_SIGNUP_HREF}
              prefetch={true}
              className="landing-audience-link"
            >
              Empezar a vender
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="landing-audience-path sm:border-l sm:border-zinc-200/80 sm:pl-12 lg:pl-16 dark:sm:border-zinc-800/80">
            <p className="landing-audience-label">Proveedores mayoristas</p>
            <h2 className="landing-audience-title">
              Sube tu catálogo una vez
            </h2>
            <p className="landing-audience-copy">
              Publica productos en el catálogo global y llega a tiendas que ya
              están listas para venderlos.
            </p>
            <Link
              href={SUPPLIER_ZONE_HREF}
              prefetch={true}
              className="landing-audience-link"
            >
              Ir a Proveedores
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
