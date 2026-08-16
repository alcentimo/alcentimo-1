import type { User } from "@supabase/supabase-js";
import { MORICHE_BRAND_LABEL } from "@/lib/mercado-oculto/access";

/**
 * Nombre comercial visible en vitrina Moriche.
 * Modelo de venta único: siempre la marca centralizada del administrador.
 */
export function resolveMayoristaDisplayName(
  _user?:
    | Pick<User, "email" | "user_metadata">
    | null
    | undefined,
  _options?: { isSupportAdmin?: boolean },
): string {
  return MORICHE_BRAND_LABEL;
}
