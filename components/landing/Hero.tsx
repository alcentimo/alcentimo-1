import Link from "next/link";
import {
  ArrowRight,
  Globe,
  RefreshCw,
  Server,
  Share2,
} from "lucide-react";
import { formatExchangeRate } from "@/lib/format";
import { ProductPreview } from "@/components/landing/ProductPreview";

interface HeroProps {
  exchangeRate: number | null;
}

const stats = [
  { value: "Tiempo real", label: "Conversión automática USD ↔ Bs." },
  { value: "PWA", label: "Arquitectura de alta disponibilidad" },
  { value: "CDN", label: "Entrega de contenido optimizada" },
];

export function Hero({ exchangeRate }: HeroProps) {
  return (
    <section className="relative overflow-hidden section-padding pt-28 sm:pt-32 lg:pt-36">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/5"
        aria-hidden="true"
      />

      <div className="page-container relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            {exchangeRate != null && (
              <div className="mb-6 flex justify-center lg:justify-start">
                <span className="price-rate-badge gap-1.5 px-3 py-1.5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Tasa del día: Bs. {formatExchangeRate(exchangeRate)} / USD
                </span>
              </div>
            )}

            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08] xl:text-5xl dark:text-zinc-50">
              Infraestructura de Gestión para el{" "}
              <span className="text-teal-600 dark:text-teal-400">
                Comercio Moderno
              </span>
            </h1>

            <p className="mt-6 text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              Alcentimo centraliza la operatividad de tu negocio, automatiza la
              conversión de divisas en tiempo real y profesionaliza tu presencia
              digital con una arquitectura de alta disponibilidad.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
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

            <ul className="mt-10 grid grid-cols-3 gap-4 border-t border-zinc-200/80 pt-8 dark:border-zinc-800">
              {stats.map((stat) => (
                <li key={stat.label}>
                  <p className="text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-50">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <ProductPreview exchangeRate={exchangeRate} />
        </div>

        <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 lg:mt-20">
          <li className="card-surface flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <Server className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Operaciones centralizadas
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Unifica inventario, catálogo y flujo comercial en una sola
                plataforma de gestión empresarial.
              </p>
            </div>
          </li>

          <li className="card-surface flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Canal digital profesional
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Despliega un catálogo corporativo con URL propia y precios
                consistentes en USD y bolívares.
              </p>
            </div>
          </li>

          <li className="card-surface flex items-start gap-3 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Rendimiento en cualquier red
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Infraestructura PWA con entrega de contenido optimizada para
                máxima disponibilidad en condiciones adversas.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
