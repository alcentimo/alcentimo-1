import {
  getProTrialSetupProgressPercent,
  isProTrialUnlockReady,
} from "@/lib/plans/trial-unlock";
import {
  PRO_TRIAL_MIN_ACTIVE_PRODUCTS,
  type ProTrialSetupPick,
} from "@/lib/onboarding/setup-status";

interface ProTrialSetupProgressProps {
  setup: ProTrialSetupPick;
}

export function ProTrialSetupProgress({ setup }: ProTrialSetupProgressProps) {
  const percent = getProTrialSetupProgressPercent(setup);
  const completed =
    (setup.hasMinProductsForProTrial ? 1 : 0) +
    (setup.hasPaymentsConfigured ? 1 : 0) +
    (setup.hasShippingConfigured ? 1 : 0);

  return (
    <div className="pro-trial-progress">
      <div className="pro-trial-progress-header">
        <span className="pro-trial-progress-label">Configuración inicial</span>
        <span className="pro-trial-progress-count">{completed}/3</span>
      </div>
      <ul className="mb-2 space-y-1 text-left text-xs text-zinc-600 dark:text-zinc-400">
        <li
          className={
            setup.hasMinProductsForProTrial
              ? "text-emerald-700 dark:text-emerald-300"
              : ""
          }
        >
          {setup.hasMinProductsForProTrial ? "✓" : "○"} Al menos{" "}
          {PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos activos
        </li>
        <li
          className={
            setup.hasPaymentsConfigured ? "text-emerald-700 dark:text-emerald-300" : ""
          }
        >
          {setup.hasPaymentsConfigured ? "✓" : "○"} Métodos de pago configurados
        </li>
        <li
          className={
            setup.hasShippingConfigured ? "text-emerald-700 dark:text-emerald-300" : ""
          }
        >
          {setup.hasShippingConfigured ? "✓" : "○"} Métodos de envío configurados
        </li>
      </ul>
      <div
        className="pro-trial-progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia prueba Pro: ${completed} de 3 pasos`}
      >
        <div
          className="pro-trial-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {isProTrialUnlockReady(setup) ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Requisitos completados. Escribe ALCENTIMO para reclamar tu mes gratis.
        </p>
      ) : null}
    </div>
  );
}
