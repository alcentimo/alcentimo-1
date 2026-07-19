"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { startProTrial } from "@/lib/plans/trial-actions";
import { formatProTrialEndsAt } from "@/lib/plans/trial";

interface ProTrialBannerProps {
  trialEligible: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
}

export function ProTrialBanner({
  trialEligible,
  trialActive,
  trialEndsAt,
}: ProTrialBannerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trialEligible && !trialActive) {
    return null;
  }

  async function handleStartTrial() {
    setError(null);
    setPending(true);

    const result = await startProTrial();

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <section className="pro-trial-banner">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
        <div className="min-w-0 flex-1">
          {trialActive ? (
            <>
              <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
                Prueba Pro activa
              </p>
              <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
                Publica hasta 250 productos hasta el{" "}
                {formatProTrialEndsAt(trialEndsAt)}.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-teal-950 dark:text-teal-50">
                Prueba Pro gratis por 1 mes
              </p>
              <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
                Sube de 10 a 250 productos sin pagar. Solo una vez por cuenta.
              </p>
            </>
          )}
          {error ? (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
          ) : null}
        </div>
      </div>

      {trialEligible ? (
        <button
          type="button"
          onClick={() => void handleStartTrial()}
          disabled={pending}
          className="pro-trial-banner-cta"
        >
          {pending ? "Activando…" : "Activar prueba Pro"}
        </button>
      ) : null}
    </section>
  );
}
