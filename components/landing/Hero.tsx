import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-40 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-25"
        aria-hidden="true"
      />

      <div className="page-container relative pb-20 sm:pb-24 lg:pb-28">
        <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
          <p className="section-label">Alcentimo</p>

          <h1 className="landing-hero-title mt-4">
            Tu negocio online,{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              con precisión
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg dark:text-zinc-400">
            Catálogo, inventario y precios en USD y bolívares — en una plataforma
            simple pensada para comercios en Venezuela.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/productos/nuevo" className="btn-brand w-full gap-2 sm:w-auto">
              Comenzar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#precios"
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
