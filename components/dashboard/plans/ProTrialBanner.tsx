"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, Lock, Sparkles } from "lucide-react";
import { startProTrial } from "@/lib/plans/trial-actions";
import { formatProTrialEndsAt } from "@/lib/plans/trial";
import {
  getProTrialProductsRemaining,
  isProTrialUnlockReady,
  PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
} from "@/lib/plans/trial-unlock";
import { ProTrialClaimFields } from "@/components/dashboard/plans/ProTrialClaimFields";
import { ProTrialProgressBar } from "@/components/dashboard/plans/ProTrialProgressBar";

interface ProTrialBannerProps {
  currentCount: number;
  unlockTarget?: number;
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
}

export function ProTrialBanner({
  currentCount,
  unlockTarget = PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
  trialEligible,
  trialActive,
  trialEndsAt,
}: ProTrialBannerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState("");

  const unlockReady = isProTrialUnlockReady(currentCount, unlockTarget);
  const remaining = getProTrialProductsRemaining(currentCount, unlockTarget);

  if (!trialEligible && !trialActive) {
    return null;
  }

  async function handleStartTrial() {
    setError(null);
    setPending(true);

    const result = await startProTrial(claimCode);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setClaimCode("");
    router.refresh();
  }

  if (trialActive) {
    return (
      <section className="pro-trial-banner pro-trial-banner--active">
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
      </section>
    );
  }

  if (!unlockReady) {
    return (
      <section className="pro-trial-banner pro-trial-banner--locked" aria-disabled="true">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Prueba Pro — Bloqueada
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Publica {remaining} producto{remaining === 1 ? "" : "s"} más para
              desbloquear un mes de prueba Pro (250 productos).
            </p>
          </div>
        </div>

        <ProTrialProgressBar currentCount={currentCount} unlockTarget={unlockTarget} />

        <Link href="/dashboard/catalogo" className="pro-trial-banner-link">
          Ir al catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="pro-trial-banner pro-trial-banner--unlocked">
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
            ¡Felicidades! Has desbloqueado una prueba Pro de 1 mes.
          </p>
          <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
            Escribe ALCENTIMO para reclamar tu premio.
          </p>
        </div>
      </div>

      <ProTrialProgressBar currentCount={currentCount} unlockTarget={unlockTarget} />

      <ProTrialClaimFields
        claimCode={claimCode}
        onClaimCodeChange={setClaimCode}
        onSubmit={() => void handleStartTrial()}
        pending={pending}
        error={error}
        unlockReady={unlockReady}
      />
    </section>
  );
}
