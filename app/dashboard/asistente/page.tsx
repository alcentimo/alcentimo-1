import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { OwnerAssistantChat } from "@/components/dashboard/assistant/OwnerAssistantChat";
import { InventoryAiSuggestionCards } from "@/components/dashboard/InventoryAiSuggestionCards";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOpenAiApiKey } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { listPendingInventorySuggestions } from "@/lib/inventory-ai/run-scan";

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

  let inventorySuggestions: Awaited<
    ReturnType<typeof listPendingInventorySuggestions>
  > = [];
  try {
    const supabase = await createClient();
    inventorySuggestions = await listPendingInventorySuggestions(
      supabase,
      store.id,
    );
  } catch {
    inventorySuggestions = [];
  }

  return (
    <PageContainer as="div" className="space-y-6 py-6 sm:py-8">
      <DashboardPageHeader
        title="Asistente IA"
        description={`Consultor de negocios con datos en tiempo real: inventario, ventas, clientes, promociones y mensajes de WhatsApp.`}
      />

      <InventoryAiSuggestionCards
        initialSuggestions={inventorySuggestions}
        variant="full"
      />

      <OwnerAssistantChat
        storeName={store.name}
        assistantEnabled={assistantEnabled}
      />
    </PageContainer>
  );
}
