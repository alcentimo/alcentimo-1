"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { hasMercadoOcultoSubscription } from "@/lib/mercado-oculto/access";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

/**
 * Destino al pulsar «Publicar producto»:
 * - sin sesión → login
 * - sin suscripción → planes
 * - suscriptor → catálogo del dashboard (productos activos se reflejan aquí)
 */
export async function resolveMercadoPublishDestination(): Promise<
  ActionResult<{ href: string }>
> {
  const supabase = await createClient();
  const authUser = await getAuthUserWithPlan(supabase);

  if (!authUser) {
    return {
      href: `/dashboard/login?next=${encodeURIComponent("/mercado-oculto")}`,
    };
  }

  if (!hasMercadoOcultoSubscription(authUser.profile)) {
    return { href: "/dashboard/planes?mercado_denied=1" };
  }

  return { href: "/dashboard/catalogo?mercado_publish=1" };
}
