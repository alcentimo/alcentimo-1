import { handleSupportAccessCheckGET } from "@/lib/support/access-check-handler";

export const dynamic = "force-dynamic";

/** Diagnóstico de acceso admin (sesión Supabase, respuesta JSON). */
export async function GET() {
  return handleSupportAccessCheckGET();
}
