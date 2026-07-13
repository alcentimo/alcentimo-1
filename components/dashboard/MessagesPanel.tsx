"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { markInboxConversationRead } from "@/lib/inbox/actions";
import {
  countSmartTab,
  DEFAULT_INBOX_FILTERS,
  type InboxListFilters,
} from "@/lib/inbox/inbox-filters";
import { buildWorkspaceGridStyle } from "@/lib/inbox/workspace-persistence";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatThread } from "@/components/inbox/ChatThread";
import { ConversationContextPanel } from "@/components/inbox/ConversationContextPanel";
import { InboxFilterBar } from "@/components/inbox/InboxFilterBar";
import { InboxDockPanel } from "@/components/inbox/InboxDockPanel";
import { InboxDockTab } from "@/components/inbox/InboxDockTab";
import { isMessengerProvider } from "@/components/inbox/MessengerChannelLabel";
import { useInboxWorkspace } from "@/components/inbox/useInboxWorkspace";
import type { VentaWithProduct } from "@/lib/sales/types";

interface MessagesPanelProps {
  initialConversations: MessageConversation[];
  hasActiveIntegrations: boolean;
  storeCountry?: string | null;
  recentSales?: VentaWithProduct[];
  salesByConversationId?: Record<string, VentaWithProduct[]>;
}

export function MessagesPanel({
  initialConversations,
  hasActiveIntegrations,
  storeCountry = null,
  recentSales = [],
  salesByConversationId = {},
}: MessagesPanelProps) {
  const [conversations, setConversations] =
    useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [listFilters, setListFilters] =
    useState<InboxListFilters>(DEFAULT_INBOX_FILTERS);
  const [, startTransition] = useTransition();

  const workspace = useInboxWorkspace();

  const facebookConversations = useMemo(
    () => conversations.filter((conversation) =>
      isMessengerProvider(conversation.provider),
    ),
    [conversations],
  );

  const mergedFilters = useMemo<InboxListFilters>(
    () => ({
      ...listFilters,
      channel: "messenger",
      status: "all",
      priority: "all",
    }),
    [listFilters],
  );

  const selectedConversation = useMemo(
    () =>
      facebookConversations.find(
        (conversation) => conversation.conversationId === selectedConversationId,
      ) ?? null,
    [facebookConversations, selectedConversationId],
  );

  const reviewCount = useMemo(
    () => countSmartTab(facebookConversations, "review"),
    [facebookConversations],
  );

  const activeCount = useMemo(
    () => countSmartTab(facebookConversations, "active"),
    [facebookConversations],
  );

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

  useEffect(() => {
    if (
      selectedConversationId &&
      facebookConversations.some(
        (conversation) => conversation.conversationId === selectedConversationId,
      )
    ) {
      return;
    }

    setSelectedConversationId(
      facebookConversations[0]?.conversationId ?? null,
    );
  }, [facebookConversations, selectedConversationId]);

  function patchConversation(
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) {
    setConversations((current) =>
      current.map((item) =>
        item.conversationId === conversationId ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleSelectConversation(conversation: MessageConversation) {
    setSelectedConversationId(conversation.conversationId);

    if (conversation.unreadCount === 0) return;

    startTransition(() => {
      void markInboxConversationRead(conversation.conversationId).then(
        (result) => {
          if (result.error) {
            console.error("[MessagesPanel] mark read error:", result.error);
            return;
          }

          patchConversation(conversation.conversationId, {
            unreadCount: 0,
            isPriority: conversation.status === "pending",
            messages: conversation.messages.map((message) =>
              message.direction === "inbound" && message.status === "unread"
                ? { ...message, status: "read" as const }
                : message,
            ),
          });
        },
      );
    });
  }

  if (conversations.length === 0) {
    return (
      <MessagesEmptyState hasActiveIntegrations={hasActiveIntegrations} />
    );
  }

  if (facebookConversations.length === 0) {
    return (
      <div className="fb-inbox">
        <header className="fb-inbox-header">
          <h1 className="fb-inbox-title">Bandeja de Facebook</h1>
        </header>
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
    <div className="fb-inbox">
      <header className="fb-inbox-header">
        <h1 className="fb-inbox-title">Bandeja de Facebook</h1>
        {reviewCount > 0 && (
          <span className="fb-inbox-pending-badge">
            {reviewCount} por responder
          </span>
        )}
      </header>

      <InboxFilterBar
        filters={listFilters}
        onFiltersChange={setListFilters}
        reviewCount={reviewCount}
        activeCount={activeCount}
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
            <ConversationList
              conversations={facebookConversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onConversationPatch={patchConversation}
              filters={mergedFilters}
            />
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
              onConversationPatch={patchConversation}
            />
          </InboxDockPanel>
        )}

        {workspace.contextCollapsed ? (
          <InboxDockTab
            side="right"
            label="Cliente"
            onExpand={() => workspace.setContextCollapsed(false)}
          />
        ) : (
          <InboxDockPanel
            title="Cliente"
            side="right"
            onCollapse={() => workspace.setContextCollapsed(true)}
            minimal
            className="inbox-context-panel"
          >
            <ConversationContextPanel
              conversation={selectedConversation}
              storeCountry={storeCountry}
              recentSales={recentSales}
              salesByConversationId={salesByConversationId}
              onConversationPatch={patchConversation}
            />
          </InboxDockPanel>
        )}
      </section>
    </div>
  );
}
