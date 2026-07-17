import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import { getSupportMessages } from "@/lib/support/get-support-messages";
import { isSupportAdmin } from "@/lib/support/is-support-admin";
import type { SupportMessage } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SoporteAdminPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/soporte");
  }

  if (!isSupportAdmin(session.authUser.email)) {
    redirect("/dashboard/catalogo");
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
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        title="Soporte"
        description="Mensajes y sugerencias enviados desde el dashboard."
      />

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
