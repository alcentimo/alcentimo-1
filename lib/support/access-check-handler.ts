import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkSupportAdminAccess,
  getSupportAdminDebugInfo,
  resolveAuthEmail,
} from "@/lib/support/admin-access";

const JSON_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
} as const;

/** Diagnóstico de acceso admin vía sesión Supabase (nunca redirige a login externo). */
export async function handleSupportAccessCheckGET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        loggedIn: false,
        isSupportAdmin: false,
        authProvider: "supabase",
        error:
          "No hay sesión de Supabase. Inicia sesión en /dashboard/login y vuelve a probar.",
      },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const email = resolveAuthEmail(user);
  const access = checkSupportAdminAccess(email);
  const debug = getSupportAdminDebugInfo(email);

  return NextResponse.json(
    {
      loggedIn: true,
      isSupportAdmin: access.ok,
      authProvider: "supabase",
      userId: user.id,
      authEmail: user.email ?? null,
      resolvedEmail: email,
      ...debug,
      hint:
        debug.reason === "empty_allowlist"
          ? "Configura SUPPORT_ADMIN_EMAILS en Vercel (Production) y redeploy."
          : debug.reason === "not_listed"
            ? "Tu correo resuelto no está en SUPPORT_ADMIN_EMAILS."
            : debug.reason === "missing_email"
              ? "Supabase no devolvió email en la sesión."
              : null,
    },
    { headers: JSON_HEADERS },
  );
}
