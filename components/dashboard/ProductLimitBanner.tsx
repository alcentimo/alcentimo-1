import Link from "next/link";
import { Sparkles, PackagePlus } from "lucide-react";
import {
  getProductLimitErrorMessage,
  isNearProductLimit,
  type ProductLimitCheck,
} from "@/src/config/plans";
import {
  PRO_TRIAL_AT_LIMIT_MESSAGE,
  PRO_TRIAL_NEAR_LIMIT_MESSAGE,
  shouldPromoteProTrialAtLimit,
  type ProTrialStatus,
} from "@/lib/plans/trial";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";

interface ProductLimitBannerProps {
  productLimit: ProductLimitCheck;
  trial?: ProTrialStatus;
  setupStatus?: ProTrialSetupPick;
}

function resolveTrialCta(setupStatus?: ProTrialSetupPick): {
  href: string;
  label: string;
} {
  if (!setupStatus) {
    return { href: "/dashboard/ajustes", label: "Completar requisitos" };
  }

  if (isProTrialUnlockReady(setupStatus)) {
    return { href: "/dashboard/catalogo", label: "Reclamar mes gratis" };
  }

  if (!setupStatus.hasMinProductsForProTrial) {
    return { href: "/dashboard/catalogo?vista=disponibles", label: "Seguir sumando" };
  }

  if (!setupStatus.hasPaymentsConfigured) {
    return {
      href: "/dashboard/ajustes?tab=payments",
      label: "Configurar pagos",
    };
  }

  if (!setupStatus.hasShippingConfigured) {
    return {
      href: "/dashboard/ajustes?tab=shipping",
      label: "Configurar envíos",
    };
  }

  return { href: "/dashboard/ajustes", label: "Completar requisitos" };
}

export function ProductLimitBanner({
  productLimit,
  trial,
  setupStatus,
}: ProductLimitBannerProps) {
  const atLimit = productLimit.hasReachedLimit;
  const nearLimit = isNearProductLimit(productLimit);

  if (!atLimit && !nearLimit) return null;

  const promoteProTrial = shouldPromoteProTrialAtLimit(trial);

  const message = promoteProTrial
    ? atLimit
      ? PRO_TRIAL_AT_LIMIT_MESSAGE
      : PRO_TRIAL_NEAR_LIMIT_MESSAGE
    : atLimit
      ? getProductLimitErrorMessage(productLimit, trial)
      : "Estás cerca de tu límite de productos.";

  const trialCta = promoteProTrial ? resolveTrialCta(setupStatus) : null;
  const ctaHref = trialCta?.href ?? "/dashboard/planes";
  const ctaLabel = trialCta?.label ?? "Ver planes";
  const Icon = promoteProTrial ? Sparkles : PackagePlus;

  return (
    <div
      role="status"
      className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        promoteProTrial
          ? "border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
          : atLimit
            ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            : "border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="text-sm leading-relaxed">
          <p className="font-medium">{message}</p>
          {!atLimit && productLimit.productLimit != null ? (
            <p className="mt-1 text-xs opacity-90">
              Productos activos: {productLimit.currentCount} /{" "}
              {productLimit.productLimit}
              {productLimit.remainingSlots != null
                ? ` · Te quedan ${productLimit.remainingSlots}`
                : null}
              {" · "}Las fotos de la galería no consumen cupos.
            </p>
          ) : null}
        </div>
      </div>
      <Link
        href={ctaHref}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          promoteProTrial || !atLimit
            ? "bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            : "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
