import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroDropshippingFlow } from "@/components/landing/HeroDropshippingFlow";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

export function Hero() {
  return (
    <section className="relative border-b border-zinc-200/60 bg-[#FAFAF9] pt-32 sm:pt-36 lg:pt-44 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-20 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-12" />
      </div>

      <div className="page-container relative pb-16 sm:pb-20 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="landing-hero-copy max-w-xl lg:max-w-none">
            <p className="landing-hero-brand">Alcéntimo</p>

            <h1 className="landing-hero-title text-balance">
              Dropshipping{" "}
              <span className="landing-hero-accent">automatizado</span>
            </h1>

            <p className="landing-hero-lead">
              Conecta tu tienda digital con inventario real de proveedores al
              instante. Sin compras por adelantado, sin logística compleja.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href={MERCHANT_SIGNUP_HREF}
                prefetch={true}
                className="landing-hero-cta landing-hero-cta-primary inline-flex gap-2 touch-manipulation"
              >
                Quiero vender
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={SUPPLIER_ZONE_HREF}
                prefetch={true}
                className="landing-hero-cta landing-hero-cta-secondary inline-flex gap-2 touch-manipulation"
              >
                Soy Proveedor / Mayorista
              </Link>
            </div>

            <ul className="landing-hero-trust">
              <li>Sin tarjeta de crédito requerida</li>
              <li>Configuración en 2 minutos</li>
            </ul>
          </div>

          <div className="landing-hero-media w-full min-w-0 lg:justify-self-end">
            <HeroDropshippingFlow />
          </div>
        </div>
      </div>
    </section>
  );
}
