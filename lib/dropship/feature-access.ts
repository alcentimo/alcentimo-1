import { isSupportAdmin } from "@/lib/support/is-support-admin";

/**
 * Dropshipping / mayoristas está en fase de desarrollo.
 * Solo el administrador de soporte del sistema ve y usa la UI.
 */
export function isDropshipFeatureEnabledForEmail(
  email: string | null | undefined,
): boolean {
  return isSupportAdmin(email);
}

export function dropshipFeatureDisabledMessage(): string {
  return "Dropshipping no está disponible en esta fase. Solo el administrador del sistema puede usarlo.";
}

/** Comprueba si el email de sesión puede usar dropshipping en el panel. */
export async function requireDropshipFeatureAccess(user: {
  email?: string | null;
} | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }
  if (!isDropshipFeatureEnabledForEmail(user.email)) {
    return { ok: false, error: dropshipFeatureDisabledMessage() };
  }
  return { ok: true };
}
