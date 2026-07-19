import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardMockup } from "@/components/landing/DashboardMockup";

const TRUST_POINTS = [
  "Listo en minutos, sin programar",
  "Pedidos directo a tu WhatsApp",
  "Precios en $ y Bs actualizados",
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/60 bg-[#FAFAF9] pt-28 sm:pt-32 lg:pt-36 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-30 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-20"
        aria-hidden="true"
      />

      <div className="page-container relative pb-16 sm:pb-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          <div className="max-w-xl lg:max-w-none">
            <Badge variant="success" className="mb-4 px-3 py-1 text-xs">
              Hecho para comercios en Venezuela
            </Badge>

            <h1 className="landing-hero-title text-balance">
              Vende más con una tienda online{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                que trabaja por ti
              </span>
            </h1>

            <p className="mt-5 text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              Publica tu catálogo, recibe pedidos por WhatsApp y lleva el control
              de tu inventario desde un panel simple — pensado para dueños de
              negocio, no para expertos en tecnología.
            </p>

            <ul className="mt-6 space-y-2.5">
              {TRUST_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/productos/nuevo"
                className="btn-brand inline-flex gap-2 px-6 shadow-lg shadow-emerald-500/15"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#precios"
                className="btn-brand-outline inline-flex justify-center px-6"
              >
                Ver planes
              </Link>
            </div>

            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Sin tarjeta de crédito · Plan gratis para empezar
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:justify-self-end">
            <DashboardMockup className="mx-auto lg:mx-0 lg:ml-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
