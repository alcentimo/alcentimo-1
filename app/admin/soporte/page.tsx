import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import type { SupportMessage } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function AdminSoportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/admin/soporte");
  }

  if (!isSupportAdmin(resolveAuthEmail(user))) {
    redirect("/dashboard/catalogo?admin_denied=not_listed");
  }

  let messages: SupportMessage[] = [];
  let loadError: string | null = null;

  try {
    messages = await getSupportMessages();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los mensajes de soporte.";
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-7 sm:py-10">
      <header className="mb-8 space-y-3">
        <Link
          href="/dashboard/catalogo"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Volver al dashboard
        </Link>
        <div>
          <p className="section-label">Administración</p>
          <h1 className="page-header-title">Bandeja de soporte</h1>
          <p className="page-header-desc">
            Mensajes de todos los usuarios de la plataforma.
          </p>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {loadError}
        </p>
      ) : (
        <SupportMessagesPanel initialMessages={messages} />
      )}
    </div>
  );
}
