import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroCompositeMockup } from "@/components/landing/HeroCompositeMockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-25 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-15"
        aria-hidden="true"
      />

      <div className="page-container relative pb-20 sm:pb-24 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="max-w-xl lg:max-w-none">
            <Badge variant="success" className="mb-5 px-3 py-1 text-xs">
              Plataforma para comercios en Venezuela
            </Badge>

            <h1 className="landing-hero-title text-balance">
              Tu negocio profesional,{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                online en minutos
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              Crea tu catálogo, comparte un enlace con tus clientes y recibe
              pedidos organizados en WhatsApp. Todo desde un panel claro que
              puedes usar tú mismo, sin depender de nadie.
            </p>

            <div className="mt-10">
              <Link
                href="/dashboard/productos/nuevo"
                className="btn-brand inline-flex gap-2 px-7 py-3 text-base shadow-lg shadow-emerald-500/20"
              >
                Comenzar gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-500">
              Sin tarjeta de crédito · Configura tu tienda en minutos
            </p>
          </div>

          <div className="w-full lg:justify-self-end">
            <HeroCompositeMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
