import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSupportAdminDebugInfo,
  resolveAuthEmail,
} from "@/lib/support/is-support-admin";

export const dynamic = "force-dynamic";

/** Diagnóstico de acceso admin (solo usuario autenticado, sin exponer allowlist completa). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { loggedIn: false, error: "Inicia sesión para ver el diagnóstico." },
      { status: 401 },
    );
  }

  const email = resolveAuthEmail(user);
  const debug = getSupportAdminDebugInfo(email);

  return NextResponse.json({
    loggedIn: true,
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
  });
}
