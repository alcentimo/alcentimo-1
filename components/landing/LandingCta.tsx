import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

export function LandingCta() {
  return (
    <section className="section-padding border-t border-zinc-200/60 pb-20 sm:pb-24 dark:border-zinc-800/60">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Elige cómo quieres empezar
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Tienda propia con catálogo listo, o panel de proveedores para subir
            productos al marketplace.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={MERCHANT_SIGNUP_HREF}
              prefetch={true}
              className="btn-brand inline-flex gap-2 px-6 touch-manipulation"
            >
              Crear tienda gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={SUPPLIER_ZONE_HREF}
              prefetch={true}
              className="btn-brand-outline inline-flex gap-2 px-6 touch-manipulation"
            >
              Acceso proveedores
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
