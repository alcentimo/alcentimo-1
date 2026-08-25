import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogAssistantEnabledPanel } from "@/components/dashboard/assistant/CatalogAssistantEnabledPanel";
import { OwnerAssistantChat } from "@/components/dashboard/assistant/OwnerAssistantChat";
import { getOpenAiApiKey } from "@/lib/env/server";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorAsistentePage() {
  const { store } = await requireSupplierHubSession({
    requireOwnStorefront: true,
  });
  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <p className="text-sm text-zinc-500">Preparando el asistente…</p>
      </PageContainer>
    );
  }

  const assistantEnabled = Boolean(getOpenAiApiKey());
  const storeSettings = await getStoreSettingsConfig(store.id);

  return (
    <PageContainer as="div" className="space-y-6 py-6 sm:py-8">
      <DashboardPageHeader
        title="Asistente IA"
        description="Consultas sobre tu inventario propio y las ventas de tu vitrina."
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
