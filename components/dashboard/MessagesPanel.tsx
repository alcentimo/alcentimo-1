"use client";

import { Loader2 } from "lucide-react";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";
import { ChatThread } from "@/components/inbox/ChatThread";
import { ConversationContextPanel } from "@/components/inbox/ConversationContextPanel";
import { InboxConversationSidebar } from "@/components/inbox/InboxConversationSidebar";
import {
  InboxSessionProvider,
  useInboxSession,
} from "@/components/inbox/InboxSessionProvider";
import type { CatalogListItem } from "@/lib/database.types";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";

export interface MessagesPanelProps {
  initialConversations: MessageConversation[];
  hasActiveIntegrations: boolean;
  storeCountry?: string | null;
  storeSlug: string;
  catalogProducts?: CatalogListItem[];
  recentSales?: VentaWithProduct[];
  salesByConversationId?: Record<string, VentaWithProduct[]>;
}

export function MessagesPanel(props: MessagesPanelProps) {
  return (
    <InboxSessionProvider initialConversations={props.initialConversations}>
      <MessagesPanelWorkspace {...props} />
    </InboxSessionProvider>
  );
}

function MessagesPanelWorkspace({
  initialConversations,
  hasActiveIntegrations,
  storeCountry = null,
  storeSlug,
  catalogProducts = [],
  recentSales = [],
  salesByConversationId = {},
}: MessagesPanelProps) {
  const {
    conversations,
    selectedConversation,
    listFilters,
    listLoading,
    setListFilters,
  } = useInboxSession();

  const hasAnyData =
    conversations.length > 0 || initialConversations.length > 0;

  if (!listLoading && !hasAnyData) {
    return (
      <div className="inbox-pro inbox-pro--empty" data-inbox-session="pro-v1">
        <MessagesEmptyState hasActiveIntegrations={hasActiveIntegrations} />
      </div>
    );
  }

  return (
    <div className="inbox-pro" data-inbox-session="pro-v1">
      {listLoading && conversations.length === 0 && (
        <p className="inbox-pro-global-loading" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Sincronizando bandeja…
        </p>
      )}

      <div className="inbox-pro-workspace">
        <aside
          className="inbox-pro-column inbox-pro-column--list"
          aria-label="Lista de conversaciones"
        >
          <InboxConversationSidebar
            filters={listFilters}
            onFiltersChange={setListFilters}
            isSynced={hasActiveIntegrations}
          />
        </aside>

        <main
          className="inbox-pro-column inbox-pro-column--chat"
          aria-label="Hilo de conversación"
        >
          <ChatThread
            conversation={selectedConversation}
            products={catalogProducts}
            storeSlug={storeSlug}
          />
        </main>

        <aside
          className="inbox-pro-column inbox-pro-column--context"
          aria-label="Contexto del cliente"
        >
          <ConversationContextPanel
            conversation={selectedConversation}
            storeCountry={storeCountry}
            recentSales={recentSales}
            salesByConversationId={salesByConversationId}
          />
        </aside>
      </div>
    </div>
  );
}
