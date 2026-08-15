import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroCatalogStaticPreview } from "@/components/landing/HeroCatalogStaticPreview";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

interface HeroProps {
  /** Tasa BCV vigente para la vista previa del catálogo. */
  exchangeRate?: number | null;
}

export function Hero({ exchangeRate = null }: HeroProps) {
  return (
    <section className="relative border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-20 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-12" />
      </div>

      <div className="page-container relative pb-16 sm:pb-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          <div className="landing-hero-copy max-w-xl lg:max-w-none">
            <p className="landing-hero-brand">Alcéntimo</p>

            <h1 className="landing-hero-title text-balance">
              Dropshipping{" "}
              <span className="landing-hero-accent">automatizado</span>.
            </h1>

            <p className="landing-hero-lead">
              Elige productos, abre tu tienda y vende sin inventario ni
              logística. La plataforma hace el resto.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={MERCHANT_SIGNUP_HREF}
                prefetch={true}
                className="btn-brand inline-flex gap-2 px-7 py-3 text-base touch-manipulation"
              >
                Crear tienda gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={SUPPLIER_ZONE_HREF}
                prefetch={true}
                className="btn-brand-outline inline-flex gap-2 px-6 py-3 text-base touch-manipulation"
              >
                Soy proveedor
              </Link>
            </div>

            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-500">
              Sin tarjeta · Sin inventario · Listo en minutos
            </p>
          </div>

          <div className="landing-hero-phone-host landing-hero-media w-full min-w-0 lg:justify-self-end">
            <HeroCatalogStaticPreview exchangeRate={exchangeRate} />
          </div>
        </div>
      </div>
    </section>
  );
}
