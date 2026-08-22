import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogAssistantEnabledPanel } from "@/components/dashboard/assistant/CatalogAssistantEnabledPanel";
import { OwnerAssistantChat } from "@/components/dashboard/assistant/OwnerAssistantChat";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOpenAiApiKey } from "@/lib/env/server";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";

export const dynamic = "force-dynamic";

export default async function AsistentePage() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/asistente");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/catalogo?vista=disponibles");
  }

  const assistantEnabled = Boolean(getOpenAiApiKey());
  const storeSettings = await getStoreSettingsConfig(store.id);

  return (
    <PageContainer as="div" className="space-y-6 py-6 sm:py-8">
      <DashboardPageHeader
        title="Asistente IA"
        description="Consultor de ventas conectado a Megabodega: stock real, precios sugeridos y apoyo para publicar productos de Alcentimo."
      />

      <CatalogAssistantEnabledPanel
        initialEnabled={storeSettings.aiAssistantEnabled}
      />

      <OwnerAssistantChat
        storeName={store.name}
        assistantEnabled={assistantEnabled}
      />
    </PageContainer>
  );
}
