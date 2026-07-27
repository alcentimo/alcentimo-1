import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { isProTrialSetupComplete } from "@/lib/onboarding/setup-status";

export function isProTrialUnlockReady(
  setup: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">,
): boolean {
  return isProTrialSetupComplete(setup);
}

export function getProTrialSetupProgressPercent(
  setup: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">,
): number {
  let completed = 0;
  if (setup.hasProducts) completed += 1;
  if (setup.hasPaymentsConfigured) completed += 1;
  return Math.round((completed / 2) * 100);
}

export function getProTrialSetupRemainingSteps(
  setup: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">,
): string[] {
  const remaining: string[] = [];
  if (!setup.hasProducts) {
    remaining.push("publicar al menos un producto en tu catálogo");
  }
  if (!setup.hasPaymentsConfigured) {
    remaining.push("configurar tus métodos de pago");
  }
  return remaining;
}

export function formatProTrialSetupRemainingMessage(
  setup: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">,
): string {
  const remaining = getProTrialSetupRemainingSteps(setup);
  if (remaining.length === 0) {
    return "";
  }
  if (remaining.length === 1) {
    return `Completa este paso para desbloquear 30 días gratis del Plan Pro: ${remaining[0]}.`;
  }
  return `Completa estos pasos para desbloquear 30 días gratis del Plan Pro: ${remaining[0]} y ${remaining[1]}.`;
}
