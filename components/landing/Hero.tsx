import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { formatExchangeRate } from "@/lib/format";
import { ProductPreview } from "@/components/landing/ProductPreview";

interface HeroProps {
  exchangeRate: number | null;
}

const stats = [
  { value: "Tiempo real", label: "Conversión USD ↔ Bs." },
  { value: "PWA", label: "Alta disponibilidad" },
  { value: "Multi-tenant", label: "Aislamiento por tienda" },
];

export function Hero({ exchangeRate }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 bg-zinc-50 pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-40 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-25"
        aria-hidden="true"
      />

      <div className="page-container relative pb-20 sm:pb-24 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="max-w-xl lg:max-w-none">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-label">Plataforma empresarial</span>
              {exchangeRate != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-300">
                  <RefreshCw className="h-3 w-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  Bs. {formatExchangeRate(exchangeRate)} / USD
                </span>
              )}
            </div>

            <h1 className="landing-hero-title mt-5">
              Infraestructura de gestión para el{" "}
              <span className="text-teal-600 dark:text-teal-400">
                comercio moderno
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-500 sm:text-lg dark:text-zinc-400">
              Centraliza inventario, catálogo y operaciones comerciales en un
              sistema unificado. Conversión de divisas automática y presencia
              digital con arquitectura de nivel empresarial.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/productos/nuevo"
                className="btn-brand w-full gap-2 sm:w-auto"
              >
                Comenzar gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#precios"
                className="btn-brand-outline w-full sm:w-auto"
              >
                Ver planes
              </Link>
            </div>

            <ul className="mt-12 flex flex-col gap-6 border-t border-zinc-200/70 pt-8 sm:flex-row sm:gap-8 dark:border-zinc-800/70">
              {stats.map((stat) => (
                <li key={stat.label} className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <ProductPreview exchangeRate={exchangeRate} />
        </div>
      </div>
    </section>
  );
}
