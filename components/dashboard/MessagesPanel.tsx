"use client";

import { useMemo, useState } from "react";
import { buildWorkspaceGridStyle } from "@/lib/inbox/workspace-persistence";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatThread } from "@/components/inbox/ChatThread";
import { ConversationContextPanel } from "@/components/inbox/ConversationContextPanel";
import { FbInboxTopBar } from "@/components/inbox/FbInboxTopBar";
import { InboxDockPanel } from "@/components/inbox/InboxDockPanel";
import { InboxDockTab } from "@/components/inbox/InboxDockTab";
import { InboxSessionProvider, useInboxSession } from "@/components/inbox/InboxSessionProvider";
import { useInboxWorkspace } from "@/components/inbox/useInboxWorkspace";
import type { CatalogListItem } from "@/lib/database.types";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { ProductFacebookPostSummary } from "@/lib/facebook/get-store-facebook-posts";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";

interface MessagesPanelProps {
  initialConversations: MessageConversation[];
  hasActiveIntegrations: boolean;
  hasMessengerIntegration?: boolean;
  storeCountry?: string | null;
  storeSlug: string;
  catalogProducts?: CatalogListItem[];
  publishedPosts?: Record<string, ProductFacebookPostSummary>;
  recentSales?: VentaWithProduct[];
  salesByConversationId?: Record<string, VentaWithProduct[]>;
}

export function MessagesPanel(props: MessagesPanelProps) {
  return (
    <InboxSessionProvider initialConversations={props.initialConversations}>
      <MessagesPanelContent {...props} />
    </InboxSessionProvider>
  );
}

function MessagesPanelContent({
  initialConversations,
  hasActiveIntegrations,
  hasMessengerIntegration = false,
  storeCountry = null,
  storeSlug,
  catalogProducts = [],
  publishedPosts: initialPublishedPosts = {},
  recentSales = [],
  salesByConversationId = {},
}: MessagesPanelProps) {
  const {
    conversations,
    facebookConversations,
    selectedConversation,
    listFilters,
    crmLoading,
    setListFilters,
  } = useInboxSession();
  const [publishedPosts, setPublishedPosts] = useState(initialPublishedPosts);
  const workspace = useInboxWorkspace();

  function handlePostPublished(
    productId: string,
    permalinkUrl: string,
    publishedAt: string,
  ) {
    setPublishedPosts((current) => ({
      ...current,
      [productId]: { postId: productId, permalinkUrl, publishedAt },
    }));
  }

  const workspaceGridStyle = useMemo(
    () =>
      buildWorkspaceGridStyle({
        listCollapsed: workspace.listCollapsed,
        chatCollapsed: workspace.chatCollapsed,
        contextCollapsed: workspace.contextCollapsed,
        channelFocus: "messenger",
      }),
    [
      workspace.listCollapsed,
      workspace.chatCollapsed,
      workspace.contextCollapsed,
    ],
  );

  if (initialConversations.length === 0) {
    return (
      <MessagesEmptyState hasActiveIntegrations={hasActiveIntegrations} />
    );
  }

  if (facebookConversations.length === 0) {
    return (
      <div className="fb-inbox">
        <FbInboxTopBar
          filters={listFilters}
          onFiltersChange={setListFilters}
          isSynced={hasActiveIntegrations}
        />
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aún no hay conversaciones de Facebook Messenger
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Conecta Messenger en Integraciones para empezar a vender.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-inbox fb-inbox--session">
      <FbInboxTopBar
        filters={listFilters}
        onFiltersChange={setListFilters}
        isSynced={hasActiveIntegrations}
      />

      <section
        className={`inbox-workspace fb-inbox-workspace ${
          !workspace.hydrated ? "inbox-workspace--hydrating" : ""
        }`}
        style={workspaceGridStyle}
      >
        {workspace.listCollapsed ? (
          <InboxDockTab
            side="left"
            label="Chats"
            onExpand={() => workspace.setListCollapsed(false)}
          />
        ) : (
          <InboxDockPanel
            title="Chats"
            side="left"
            onCollapse={() => workspace.setListCollapsed(true)}
            minimal
          >
            <ConversationList />
          </InboxDockPanel>
        )}

        {workspace.chatCollapsed ? (
          <InboxDockTab
            side="center"
            label="Chat"
            onExpand={() => workspace.setChatCollapsed(false)}
          />
        ) : (
          <InboxDockPanel
            title="Conversación"
            side="center"
            onCollapse={() => workspace.setChatCollapsed(true)}
            minimal
            className="inbox-chat-panel"
          >
            <ChatThread
              conversation={selectedConversation}
              products={catalogProducts}
              storeSlug={storeSlug}
              hasMessengerIntegration={hasMessengerIntegration}
              publishedPosts={publishedPosts}
              onPostPublished={handlePostPublished}
            />
          </InboxDockPanel>
        )}

        {workspace.contextCollapsed ? (
          <InboxDockTab
            side="right"
            label="Negociación"
            onExpand={() => workspace.setContextCollapsed(false)}
          />
        ) : (
          <InboxDockPanel
            title="Gestión de la Negociación"
            side="right"
            onCollapse={() => workspace.setContextCollapsed(true)}
            minimal
            className="inbox-context-panel"
          >
            {crmLoading && selectedConversation?.contactId && (
              <p className="inbox-context-loading" role="status">
                Cargando notas y etiquetas…
              </p>
            )}
            <ConversationContextPanel
              conversation={selectedConversation}
              storeCountry={storeCountry}
              recentSales={recentSales}
              salesByConversationId={salesByConversationId}
            />
          </InboxDockPanel>
        )}
      </section>
    </div>
  );
}
