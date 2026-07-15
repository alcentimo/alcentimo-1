import { LineChart } from "lucide-react";

export function FinancialConsistencyHighlight() {
  return (
    <section className="section-padding border-y border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="page-container">
        <div className="card-surface mx-auto flex max-w-4xl flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
            <LineChart className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
              Consistencia Financiera
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
              La integración nativa con tasas de cambio asegura que tus precios en
              Bs. siempre reflejen la realidad del mercado al instante, eliminando
              errores manuales de cálculo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
