"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Sparkles, Lock } from "lucide-react";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";
import { ProTrialSetupProgress } from "@/components/dashboard/plans/ProTrialSetupProgress";
import { ProTrialClaimModal } from "@/components/dashboard/plans/ProTrialClaimModal";
import { ProTrialActivationWatcher } from "@/components/onboarding/ProTrialActivationWatcher";

interface ProTrialBannerProps {
  showBanner: boolean;
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  setupStatus: ProTrialSetupPick;
  /** Abre el modal ALCENTIMO al montar si los requisitos ya están listos. */
  autoOpenClaimModal?: boolean;
  /**
   * Banner denso (catálogo): sin párrafos largos; título, progreso, requisitos y acciones.
   */
  compact?: boolean;
}

function setupCompletedCount(setup: ProTrialSetupPick): number {
  return (
    (setup.hasMinProductsForProTrial ? 1 : 0) +
    (setup.hasPaymentsConfigured ? 1 : 0) +
    (setup.hasShippingConfigured ? 1 : 0)
  );
}

export function ProTrialBanner({
  showBanner,
  trialEligible,
  trialActive,
  trialEndsAt,
  setupStatus,
  autoOpenClaimModal = true,
  compact = false,
}: ProTrialBannerProps) {
  const unlockReady =
    trialEligible && !trialActive && isProTrialUnlockReady(setupStatus);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const completed = setupCompletedCount(setupStatus);

  useEffect(() => {
    if (autoOpenClaimModal && unlockReady) {
      setClaimModalOpen(true);
    }
  }, [autoOpenClaimModal, unlockReady]);

  if (!showBanner) {
    return null;
  }

  const bannerClass = [
    "pro-trial-banner",
    trialActive
      ? "pro-trial-banner--active"
      : unlockReady
        ? "pro-trial-banner--unlocked"
        : "pro-trial-banner--locked",
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
              Publica hasta 250 productos hasta el{" "}
              {formatProTrialEndsAt(trialEndsAt)}.
            </p>
          </div>
        </div>
        <Link href="/dashboard/catalogo" className="pro-trial-banner-cta">
          Ir al catálogo
        </Link>
      </section>
    );
  } else if (trialEligible && !unlockReady) {
    banner = compact ? (
      <section className={bannerClass}>
        <div className="pro-trial-banner-compact-row">
          <div className="pro-trial-banner-compact-title">
            <Lock className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Prueba gratis — Plan Pro ($8)
            </p>
          </div>
          <span className="pro-trial-progress-count text-xs">{completed}/3</span>
        </div>

        <ProTrialSetupProgress
          setup={setupStatus}
          compact
          hideHeader
          hideUnlockHint
        />

        <div className="pro-trial-banner-actions">
          {!setupStatus.hasMinProductsForProTrial ? (
            <Link href="/dashboard/catalogo?nuevo=1" className="pro-trial-banner-link">
              Añadir productos
            </Link>
          ) : null}
          {!setupStatus.hasPaymentsConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=payments"
              className="pro-trial-banner-link"
            >
              Configurar pagos
            </Link>
          ) : null}
          {!setupStatus.hasShippingConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=shipping"
              className="pro-trial-banner-link"
            >
              Configurar envíos
            </Link>
          ) : null}
        </div>
      </section>
    ) : (
      <section className={bannerClass}>
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Prueba gratis disponible — Plan Pro ($8)
            </p>
          </div>
        </div>

        <ProTrialSetupProgress setup={setupStatus} />

        <div className="mt-3 flex flex-wrap gap-3">
          {!setupStatus.hasMinProductsForProTrial ? (
            <Link href="/dashboard/catalogo?nuevo=1" className="pro-trial-banner-link">
              Añadir productos
            </Link>
          ) : null}
          {!setupStatus.hasPaymentsConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=payments"
              className="pro-trial-banner-link"
            >
              Configurar pagos
            </Link>
          ) : null}
          {!setupStatus.hasShippingConfigured ? (
            <Link
              href="/dashboard/ajustes?tab=shipping"
              className="pro-trial-banner-link"
            >
              Configurar envíos
            </Link>
          ) : null}
        </div>
      </section>
    );
  } else if (unlockReady) {
    banner = compact ? (
      <section className={bannerClass}>
        <div className="pro-trial-banner-compact-row">
          <div className="pro-trial-banner-compact-title">
            <Sparkles className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
            <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              Requisitos listos — reclama tu mes Pro
            </p>
          </div>
          <span className="pro-trial-progress-count text-xs">3/3</span>
        </div>

        <ProTrialSetupProgress
          setup={setupStatus}
          compact
          hideHeader
          hideUnlockHint
        />

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
              Requisitos completados
            </p>
            <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
              Confirma con la palabra ALCENTIMO para reclamar tu mes gratis del
              Plan Pro.
            </p>
          </div>
        </div>
        <ProTrialSetupProgress setup={setupStatus} />
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

  if (!banner && !unlockReady) {
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
