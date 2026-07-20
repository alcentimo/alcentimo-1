import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  getProductLimitErrorMessage,
  isNearProductLimit,
  type ProductLimitCheck,
} from "@/src/config/plans";
import {
  PRO_TRIAL_AT_LIMIT_MESSAGE,
  shouldPromoteProTrialAtLimit,
  type ProTrialStatus,
} from "@/lib/plans/trial";

interface ProductLimitBannerProps {
  productLimit: ProductLimitCheck;
  trial?: ProTrialStatus;
}

export function ProductLimitBanner({
  productLimit,
  trial,
}: ProductLimitBannerProps) {
  const atLimit = productLimit.hasReachedLimit;
  const nearLimit = isNearProductLimit(productLimit);

  if (!atLimit && !nearLimit) return null;

  const promoteProTrial = shouldPromoteProTrialAtLimit(trial);

  const message = atLimit
    ? promoteProTrial
      ? PRO_TRIAL_AT_LIMIT_MESSAGE
      : getProductLimitErrorMessage(productLimit, trial)
    : "Estás cerca de tu límite de productos.";

  const ctaHref = promoteProTrial ? "/activar" : "/dashboard/planes";
  const ctaLabel = promoteProTrial ? "Activar prueba Pro" : "Ver planes";

  return (
    <div
      role="status"
      className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        atLimit
          ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="text-sm leading-relaxed">
          <p className="font-medium">{message}</p>
          {!atLimit && productLimit.productLimit != null && (
            <p className="mt-1 text-xs opacity-90">
              Productos activos: {productLimit.currentCount} /{" "}
              {productLimit.productLimit}
              {productLimit.remainingSlots != null &&
                ` · Te quedan ${productLimit.remainingSlots}`}
            </p>
          )}
        </div>
      </div>
      <Link
        href={ctaHref}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          atLimit
            ? "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            : "bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
