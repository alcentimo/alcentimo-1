import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="section-padding bg-teal-600 dark:bg-teal-700">
      <div className="page-container text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Eleva la gestión de tu operación comercial
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-teal-100">
          Implementa tu infraestructura digital en minutos. Centraliza inventario,
          profesionaliza tu catálogo y opera con precisión financiera en USD y
          bolívares.
        </p>
        <Link
          href="/dashboard/productos/nuevo"
          className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-teal-700 shadow-sm transition-all hover:bg-teal-50 active:scale-[0.98] md:text-sm"
        >
          Comenzar gratis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
