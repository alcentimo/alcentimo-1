import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import {
  getStoreInboxConversations,
} from "@/lib/inbox/get-store-messages";
import {
  getStoreIntegrations,
  getIntegrationForProvider,
  hasActiveIntegrations,
} from "@/lib/inbox/get-store-integrations";
import { getStoreFacebookPostsByProduct } from "@/lib/facebook/get-store-facebook-posts";
import { buildConversationSalesMap } from "@/lib/inbox/contact-sales";
import { getStoreSales } from "@/lib/sales/get-store-sales";
import { getStoreInventory } from "@/lib/inventory";
import { MessagesPanel } from "@/components/dashboard/MessagesPanel";
import { MensajesPageShell } from "@/components/dashboard/MensajesPageShell";
import { PageContainer } from "@/components/ui/PageContainer";

export const dynamic = "force-dynamic";

export default async function MensajesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/mensajes");
  }

  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Atención al cliente</p>
          <h1 className="page-header-title">Mensajes</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para recibir mensajes de WhatsApp y Meta.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [conversations, integrations, recentSales, inventory, publishedPostsResult] =
    await Promise.all([
    getStoreInboxConversations(supabase, store.id, {
      storeCountry: store.country,
    }),
    getStoreIntegrations(supabase, store.id),
    getStoreSales(store.id, 100),
    getStoreInventory(store.slug),
    getStoreFacebookPostsByProduct(supabase, store.id).catch(() => ({})),
  ]);
  const publishedPosts = publishedPostsResult;
  const activeIntegrations = hasActiveIntegrations(integrations);
  const messengerIntegration = getIntegrationForProvider(integrations, "messenger");
  const salesByConversationId = buildConversationSalesMap(
    conversations,
    recentSales,
  );

  return (
    <MensajesPageShell>
      <MessagesPanel
        initialConversations={conversations}
        hasActiveIntegrations={activeIntegrations}
        hasMessengerIntegration={Boolean(messengerIntegration)}
        storeCountry={store.country}
        storeSlug={store.slug}
        catalogProducts={inventory.products}
        publishedPosts={publishedPosts}
        recentSales={recentSales}
        salesByConversationId={salesByConversationId}
      />
    </MensajesPageShell>
  );
}
