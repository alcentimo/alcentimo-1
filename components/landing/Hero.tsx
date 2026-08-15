import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroCatalogStaticPreview } from "@/components/landing/HeroCatalogStaticPreview";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";

const heroHighlights = [
  "Acceso a un catálogo de productos listos para vender.",
  "Tu tienda online lista para compartir por WhatsApp.",
  "IA que te ayuda a vender más, sin ser experto.",
] as const;

interface HeroProps {
  /** Tasa BCV vigente para la vista previa del catálogo. */
  exchangeRate?: number | null;
}

export function Hero({ exchangeRate = null }: HeroProps) {
  return (
    <section className="relative border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      {/* Overflow solo en el fondo decorativo: no debe recortar las etiquetas del mockup */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-25 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-15" />
      </div>

      <div className="page-container relative pb-20 sm:pb-24 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="max-w-xl lg:max-w-none">
            <p className="landing-hero-ai-pill">
              Empieza tu negocio de dropshipping hoy
            </p>

            <h1 className="landing-hero-title text-balance">
              Tu propio negocio digital{" "}
              <span className="landing-hero-accent">en minutos</span>.
            </h1>

            <p className="landing-hero-lead">
              Elige productos, agrégalos a tu tienda y empieza a vender hoy sin
              inventario ni costos de logística.
            </p>

            <ul className="landing-hero-highlights">
              {heroHighlights.map((item) => (
                <li key={item} className="landing-hero-highlight">
                  <Sparkles
                    className="landing-hero-highlight-icon"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                href={MERCHANT_SIGNUP_HREF}
                prefetch={true}
                className="btn-brand inline-flex gap-2 px-7 py-3 text-base shadow-lg shadow-emerald-500/20 touch-manipulation"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-500">
              Sin tarjeta · Sin inventario · Empieza en minutos
            </p>
          </div>

          <div className="landing-hero-phone-host w-full min-w-0 lg:justify-self-end">
            <HeroCatalogStaticPreview exchangeRate={exchangeRate} />
          </div>
        </div>
      </div>
    </section>
  );
}
