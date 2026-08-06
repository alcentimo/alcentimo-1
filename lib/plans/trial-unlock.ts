import {
  isProTrialSetupComplete,
  PRO_TRIAL_MIN_ACTIVE_PRODUCTS,
  type ProTrialSetupPick,
} from "@/lib/onboarding/setup-status";

export function isProTrialUnlockReady(setup: ProTrialSetupPick): boolean {
  return isProTrialSetupComplete(setup);
}

export function getProTrialSetupProgressPercent(setup: ProTrialSetupPick): number {
  let completed = 0;
  if (setup.hasMinProductsForProTrial) completed += 1;
  if (setup.hasPaymentsConfigured) completed += 1;
  if (setup.hasShippingConfigured) completed += 1;
  return Math.round((completed / 3) * 100);
}

export function getProTrialSetupRemainingSteps(setup: ProTrialSetupPick): string[] {
  const remaining: string[] = [];
  if (!setup.hasMinProductsForProTrial) {
    remaining.push(
      `tener al menos ${PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos activos en tu catálogo`,
    );
  }
  if (!setup.hasPaymentsConfigured) {
    remaining.push("configurar tus métodos de pago");
  }
  if (!setup.hasShippingConfigured) {
    remaining.push("configurar tus métodos de envío");
  }
  return remaining;
}

export function formatProTrialSetupRemainingMessage(setup: ProTrialSetupPick): string {
  const remaining = getProTrialSetupRemainingSteps(setup);
  if (remaining.length === 0) {
    return "";
  }
  if (remaining.length === 1) {
    return `Completa este paso para desbloquear 30 días gratis del Plan Profesional: ${remaining[0]}.`;
  }
  if (remaining.length === 2) {
    return `Completa estos pasos para desbloquear 30 días gratis del Plan Profesional: ${remaining[0]} y ${remaining[1]}.`;
  }
  return `Completa estos pasos para desbloquear 30 días gratis del Plan Profesional: ${remaining[0]}, ${remaining[1]} y ${remaining[2]}.`;
}
