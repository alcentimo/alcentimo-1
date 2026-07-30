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
  /** Versión densa para catálogo y superficies donde el espacio importa. */
  compact?: boolean;
  /** Oculta la fila "Configuración inicial / n/3" (útil si el padre ya muestra el conteo). */
  hideHeader?: boolean;
  /** Oculta el mensaje de desbloqueo listo. */
  hideUnlockHint?: boolean;
}

export function ProTrialSetupProgress({
  setup,
  compact = false,
  hideHeader = false,
  hideUnlockHint = false,
}: ProTrialSetupProgressProps) {
  const percent = getProTrialSetupProgressPercent(setup);
  const completed =
    (setup.hasMinProductsForProTrial ? 1 : 0) +
    (setup.hasPaymentsConfigured ? 1 : 0) +
    (setup.hasShippingConfigured ? 1 : 0);

  const steps = (
    <ul
      className={
        compact
          ? "pro-trial-progress-steps pro-trial-progress-steps--compact"
          : "mb-2 space-y-1 text-left text-xs text-zinc-600 dark:text-zinc-400"
      }
    >
      <li
        className={
          setup.hasMinProductsForProTrial
            ? "text-emerald-700 dark:text-emerald-300"
            : undefined
        }
      >
        {setup.hasMinProductsForProTrial ? "✓" : "○"}{" "}
        {compact
          ? `${PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos`
          : `Al menos ${PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos activos`}
      </li>
      <li
        className={
          setup.hasPaymentsConfigured
            ? "text-emerald-700 dark:text-emerald-300"
            : undefined
        }
      >
        {setup.hasPaymentsConfigured ? "✓" : "○"}{" "}
        {compact ? "Pagos" : "Métodos de pago configurados"}
      </li>
      <li
        className={
          setup.hasShippingConfigured
            ? "text-emerald-700 dark:text-emerald-300"
            : undefined
        }
      >
        {setup.hasShippingConfigured ? "✓" : "○"}{" "}
        {compact ? "Envíos" : "Métodos de envío configurados"}
      </li>
    </ul>
  );

  return (
    <div className={compact ? "pro-trial-progress pro-trial-progress--compact" : "pro-trial-progress"}>
      {!hideHeader ? (
        <div className="pro-trial-progress-header">
          <span className="pro-trial-progress-label">
            {compact ? "Progreso" : "Configuración inicial"}
          </span>
          <span className="pro-trial-progress-count">{completed}/3</span>
        </div>
      ) : null}
      {steps}
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
      {!hideUnlockHint && isProTrialUnlockReady(setup) ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Requisitos completados. Escribe ALCENTIMO en el modal para reclamar tu
          mes gratis.
        </p>
      ) : null}
    </div>
  );
}
