/**
 * Dropshipping / mayoristas: disponible para cualquier usuario autenticado
 * en el panel de configuración de su tienda.
 */
export function isDropshipFeatureEnabledForEmail(
  _email: string | null | undefined,
): boolean {
  return true;
}

export function dropshipFeatureDisabledMessage(): string {
  return "Dropshipping no está disponible. Debes iniciar sesión.";
}

/** Comprueba si el usuario de sesión puede usar dropshipping en el panel. */
export async function requireDropshipFeatureAccess(user: {
  email?: string | null;
} | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }
  return { ok: true };
}
