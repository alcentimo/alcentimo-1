"use server";

import { createClient } from "@/lib/supabase/server";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

/**
 * Destino de gestión (solo Super Admin): ajustes de dropshipping.
 */
export async function resolveMercadoPublishDestination(): Promise<
  ActionResult<{ href: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      href: `/dashboard/login?next=${encodeURIComponent("/mercado-oculto")}`,
    };
  }

  if (!hasMercadoOcultoSuperAdminUser(user)) {
    return { href: "/dashboard/catalogo?mercado_denied=not_listed" };
  }

  return { href: "/dashboard/ajustes?tab=dropship" };
}
