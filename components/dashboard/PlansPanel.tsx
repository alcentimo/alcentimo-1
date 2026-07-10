import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import {
  formatProductLimit,
  PLANS,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";
import { formatUsd } from "@/lib/format";

interface PlansPanelProps {
  currentPlanId: PlanId;
  currentPlanName: string;
  productCount?: number | null;
  productLimit?: number | null;
}

interface ComparisonRow {
  feature: string;
  free: string;
  premium: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Productos activos",
    free: formatProductLimit(PLANS.free.productLimit),
    premium: "Ilimitados",
  },
  {
    feature: "Catálogo público",
    free: "Incluido",
    premium: "Incluido",
  },
  {
    feature: "Cupones y promociones",
    free: "Incluido",
    premium: "Incluido",
  },
  {
    feature: "Variantes de producto",
    free: "Incluido",
    premium: "Incluido",
  },
  {
    feature: "Alertas de stock",
    free: "Incluido",
    premium: "Incluido",
  },
  {
    feature: "Usuarios del equipo",
    free: "1",
    premium: "Ilimitados",
  },
  {
    feature: "Soporte",
    free: "Comunidad",
    premium: "Dedicado",
  },
  {
    feature: "Precio anual",
    free: "Gratis",
    premium: formatUsd(PLANS.premium.priceUsdYearly),
  },
];

function planDisplayName(plan: PlanDefinition): string {
  return plan.id === "free" ? "Gratis" : plan.name.replace(/^Plan\s+/i, "");
}

export function PlansPanel({
  currentPlanId,
  currentPlanName,
  productCount = null,
  productLimit = null,
}: PlansPanelProps) {
  const freePlan = PLANS.free;
  const premiumPlan = PLANS.premium;
  const isPremium = currentPlanId === "premium";

  return (
    <div className="space-y-8">
      <section className="card-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="section-label">Tu suscripción</p>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {currentPlanName}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {isPremium
                  ? "Disfrutas de productos ilimitados y soporte dedicado."
                  : "Todas las funciones incluidas. Escala cuando necesites más productos."}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            Plan actual
          </span>
        </div>

        {productCount != null && productLimit != null && !isPremium && (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Productos activos:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {productCount} / {formatProductLimit(productLimit)}
            </span>
          </p>
        )}
      </section>

      <section>
        <header className="page-header mb-6">
          <p className="section-label">Comparativa</p>
          <h2 className="page-header-title">Gratis vs Premium</h2>
          <p className="page-header-desc">
            El plan Gratis incluye todas las herramientas del panel. Premium
            desbloquea catálogo ilimitado y soporte prioritario.
          </p>
        </header>

        <div className="card-panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <th className="px-5 py-4 font-semibold text-zinc-500 dark:text-zinc-400">
                    Característica
                  </th>
                  <th className="px-5 py-4 font-semibold text-zinc-900 dark:text-zinc-50">
                    {planDisplayName(freePlan)}
                  </th>
                  <th className="px-5 py-4 font-semibold text-teal-700 dark:text-teal-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Crown className="h-4 w-4" aria-hidden="true" />
                      {planDisplayName(premiumPlan)}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-5 py-4 font-medium text-zinc-700 dark:text-zinc-300">
                      {row.feature}
                    </td>
                    <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                      {row.free}
                    </td>
                    <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                      {row.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {!isPremium && (
        <section className="card-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ¿Listo para crecer sin límites?
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Actualiza a Premium para publicar productos ilimitados y contar
              con soporte dedicado.
            </p>
          </div>
          <Link
            href="mailto:info@alcentimo.com?subject=Actualizar%20a%20Premium"
            className="btn-brand w-full shrink-0 sm:w-auto"
          >
            Contactar para Premium
          </Link>
        </section>
      )}

      {isPremium && (
        <div className="info-box flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
          <p className="text-sm">
            Ya tienes el plan Premium activo. Gracias por confiar en alcentimo.
          </p>
        </div>
      )}
    </div>
  );
}
