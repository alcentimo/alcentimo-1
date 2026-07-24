import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { OwnerAssistantChat } from "@/components/dashboard/assistant/OwnerAssistantChat";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOpenAiApiKey } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export default async function AsistentePage() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/asistente");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const assistantEnabled = Boolean(getOpenAiApiKey());

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        title="Asistente IA"
        description={`Consultas de inventario, ventas y operaciones para ${store.name}. Los datos se actualizan en cada mensaje.`}
        storeSlug={store.slug}
      />

      <OwnerAssistantChat
        storeName={store.name}
        assistantEnabled={assistantEnabled}
      />
    </PageContainer>
  );
}
