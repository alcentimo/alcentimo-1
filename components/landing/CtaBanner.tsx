import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="section-padding border-t border-zinc-200/60 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div className="page-container">
        <div className="rounded-xl border border-zinc-200/60 bg-zinc-900 px-6 py-10 sm:px-10 sm:py-12 lg:px-12 dark:border-zinc-800/60 dark:bg-zinc-900">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              Implementación inmediata
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Eleva la gestión de tu operación comercial
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
              Centraliza inventario, profesionaliza tu catálogo y opera con
              precisión financiera en USD y bolívares — la misma infraestructura
              que impulsa tu dashboard.
            </p>
            <Link
              href="/dashboard/productos/nuevo"
              className="btn-brand mt-8 gap-2"
            >
              Comenzar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
