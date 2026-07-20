import {
  getProTrialProgressPercent,
  PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
} from "@/lib/plans/trial-unlock";

interface ProTrialProgressBarProps {
  currentCount: number;
  unlockTarget?: number;
  showLabel?: boolean;
}

export function ProTrialProgressBar({
  currentCount,
  unlockTarget = PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
  showLabel = true,
}: ProTrialProgressBarProps) {
  const percent = getProTrialProgressPercent(currentCount, unlockTarget);
  const cappedCount = Math.min(currentCount, unlockTarget);

  return (
    <div className="pro-trial-progress">
      {showLabel ? (
        <div className="pro-trial-progress-header">
          <span className="pro-trial-progress-label">Productos</span>
          <span className="pro-trial-progress-count">
            {cappedCount}/{unlockTarget}
          </span>
        </div>
      ) : null}
      <div
        className="pro-trial-progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso hacia prueba Pro: ${cappedCount} de ${unlockTarget} productos`}
      >
        <div
          className="pro-trial-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
