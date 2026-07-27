import {
  getProTrialSetupProgressPercent,
  isProTrialUnlockReady,
} from "@/lib/plans/trial-unlock";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";

interface ProTrialSetupProgressProps {
  setup: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">;
}

export function ProTrialSetupProgress({ setup }: ProTrialSetupProgressProps) {
  const percent = getProTrialSetupProgressPercent(setup);
  const completed = (setup.hasProducts ? 1 : 0) + (setup.hasPaymentsConfigured ? 1 : 0);

  return (
    <div className="pro-trial-progress">
      <div className="pro-trial-progress-header">
        <span className="pro-trial-progress-label">Configuración inicial</span>
        <span className="pro-trial-progress-count">{completed}/2</span>
      </div>
      <ul className="mb-2 space-y-1 text-left text-xs text-zinc-600 dark:text-zinc-400">
        <li className={setup.hasProducts ? "text-emerald-700 dark:text-emerald-300" : ""}>
          {setup.hasProducts ? "✓" : "○"} Catálogo con productos
        </li>
        <li
          className={
            setup.hasPaymentsConfigured ? "text-emerald-700 dark:text-emerald-300" : ""
          }
        >
          {setup.hasPaymentsConfigured ? "✓" : "○"} Métodos de pago configurados
        </li>
      </ul>
      <div
        className="pro-trial-progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia prueba Pro: ${completed} de 2 pasos`}
      >
        <div
          className="pro-trial-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {isProTrialUnlockReady(setup) ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Requisitos completados. Activando tu prueba Pro…
        </p>
      ) : null}
    </div>
  );
}
