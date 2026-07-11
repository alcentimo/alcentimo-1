import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import {
  buildMessageConversations,
  getStoreChannelMessages,
} from "@/lib/inbox/get-store-messages";
import { MessagesPanel } from "@/components/dashboard/MessagesPanel";
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

  const messages = await getStoreChannelMessages(supabase, store.id);
  const conversations = buildMessageConversations(messages);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Atención al cliente</p>
        <h1 className="page-header-title">Mensajes</h1>
        <p className="page-header-desc">
          Conversaciones de WhatsApp y Meta para {store.name}.
        </p>
      </header>

      <MessagesPanel initialConversations={conversations} />
    </PageContainer>
  );
}
