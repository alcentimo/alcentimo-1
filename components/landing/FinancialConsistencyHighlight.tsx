import { LineChart } from "lucide-react";

export function FinancialConsistencyHighlight() {
  return (
    <section className="border-b border-zinc-200/60 bg-zinc-50 py-12 sm:py-14 dark:border-zinc-800/60 dark:bg-zinc-950">
      <div className="page-container">
        <div className="flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
            <LineChart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
              Consistencia financiera
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base dark:text-zinc-400">
              La integración nativa con tasas de cambio asegura que tus precios
              en Bs. reflejen la realidad del mercado al instante, eliminando
              errores manuales de cálculo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
