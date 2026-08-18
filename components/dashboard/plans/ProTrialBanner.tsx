"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Sparkles } from "lucide-react";
import { formatProTrialEndsAt, getProTrialLimitLabel } from "@/lib/plans/trial";
import { ProTrialClaimModal } from "@/components/dashboard/plans/ProTrialClaimModal";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";

interface ProTrialBannerProps {
  showBanner: boolean;
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  /** Límite de productos del Plan Profesional (prueba); evita hardcodear. */
  proProductLimit?: number | null;
  /**
   * Banner denso (catálogo): sin párrafos largos; título y acciones.
   */
  compact?: boolean;
}

export function ProTrialBanner({
  showBanner,
  trialEligible,
  trialActive,
  trialEndsAt,
  proProductLimit,
  compact = false,
}: ProTrialBannerProps) {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const proLimitLabel = getProTrialLimitLabel(proProductLimit);

  if (!showBanner) {
    return null;
  }

  const bannerClass = [
    "pro-trial-banner",
    trialActive ? "pro-trial-banner--active" : "pro-trial-banner--unlocked",
    compact ? "pro-trial-banner--compact" : null,
  ]
    .filter(Boolean)
    .join(" ");

  let banner: React.ReactNode = null;

  if (trialActive) {
    banner = compact ? (
      <section className={bannerClass}>
        <div className="pro-trial-banner-compact-row">
          <div className="pro-trial-banner-compact-title">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              Prueba Pro activa
              {trialEndsAt ? (
                <span className="ml-1.5 font-normal text-teal-900/70 dark:text-teal-100/70">
                  · hasta {formatProTrialEndsAt(trialEndsAt)}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </section>
    ) : (
      <section className={bannerClass}>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              Prueba Pro activa
            </p>
            <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
              Publica hasta {proLimitLabel} hasta el{" "}
              {formatProTrialEndsAt(trialEndsAt)}.
            </p>
          </div>
        </div>
        <Link href="/dashboard/catalogo" className="pro-trial-banner-cta">
          Ir al catálogo
        </Link>
      </section>
    );
  } else if (trialEligible) {
    banner = compact ? (
      <section className={bannerClass}>
        <div className="pro-trial-banner-compact-row">
          <div className="pro-trial-banner-compact-title">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              30 días gratis — Plan Profesional
            </p>
          </div>
        </div>

        <div className="pro-trial-banner-actions">
          <button
            type="button"
            className="pro-trial-banner-cta"
            onClick={() => setClaimModalOpen(true)}
          >
            Reclamar mes gratis
          </button>
        </div>
      </section>
    ) : (
      <section className={bannerClass}>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              30 días gratis del Plan Profesional
            </p>
            <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
              Reclama tu mes gratis con ALCENTIMO o elige un plan de pago.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="pro-trial-banner-cta"
          onClick={() => setClaimModalOpen(true)}
        >
          Reclamar mes gratis
        </button>
      </section>
    );
  }

  if (!banner) {
    return null;
  }

  return (
    <>
      {trialEligible || trialActive ? (
        <Suspense fallback={null}>
          <ProTrialActivationWatcher trialActive={trialActive} />
        </Suspense>
      ) : null}
      {banner}
      {trialEligible && !trialActive ? (
        <ProTrialClaimModal
          open={claimModalOpen}
          onOpenChange={setClaimModalOpen}
        />
      ) : null}
    </>
  );
}
