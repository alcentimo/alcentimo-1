"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { markInboxConversationRead } from "@/lib/inbox/actions";
import {
  countSmartTab,
  DEFAULT_INBOX_FILTERS,
  type InboxListFilters,
} from "@/lib/inbox/inbox-filters";
import {
  buildWorkspaceGridStyle,
  isChannelFocusActive,
} from "@/lib/inbox/workspace-persistence";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatThread } from "@/components/inbox/ChatThread";
import { ConversationContextPanel } from "@/components/inbox/ConversationContextPanel";
import { ChannelFocusSelector } from "@/components/inbox/ChannelFocusSelector";
import { InboxDockPanel } from "@/components/inbox/InboxDockPanel";
import { InboxDockTab } from "@/components/inbox/InboxDockTab";
import { useInboxWorkspace } from "@/components/inbox/useInboxWorkspace";
import type { VentaWithProduct } from "@/lib/sales/types";

interface MessagesPanelProps {
  initialConversations: MessageConversation[];
  hasActiveIntegrations: boolean;
  storeCountry?: string | null;
  recentSales?: VentaWithProduct[];
}

export function MessagesPanel({
  initialConversations,
  hasActiveIntegrations,
  storeCountry = null,
  recentSales = [],
}: MessagesPanelProps) {
  const [conversations, setConversations] =
    useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(initialConversations[0]?.conversationId ?? null);
  const [listFilters, setListFilters] =
    useState<InboxListFilters>(DEFAULT_INBOX_FILTERS);
  const [, startTransition] = useTransition();

  const workspace = useInboxWorkspace();
  const channelFocusActive = isChannelFocusActive(workspace.channelFocus);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.conversationId === selectedConversationId,
      ) ?? null,
    [conversations, selectedConversationId],
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  const reviewCount = useMemo(
    () => countSmartTab(conversations, "review"),
    [conversations],
  );

  const activeCount = useMemo(
    () => countSmartTab(conversations, "active"),
    [conversations],
  );

  const mergedFilters = useMemo<InboxListFilters>(
    () => ({
      ...listFilters,
      channel: workspace.channelFocus,
    }),
    [listFilters, workspace.channelFocus],
  );

  const workspaceGridStyle = useMemo(
    () =>
      buildWorkspaceGridStyle({
        listCollapsed: workspace.listCollapsed,
        chatCollapsed: workspace.chatCollapsed,
        contextCollapsed: workspace.contextCollapsed,
        channelFocus: workspace.channelFocus,
      }),
    [
      workspace.listCollapsed,
      workspace.chatCollapsed,
      workspace.contextCollapsed,
      workspace.channelFocus,
    ],
  );

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].conversationId);
    }
  }, [conversations, selectedConversationId]);

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

  return (
    <div className="space-y-4">
      {!channelFocusActive && (
        <div className="inbox-stats-bar">
          <div className="inbox-stat">
            <span className="inbox-stat-label">Total</span>
            <span className="inbox-stat-value">{conversations.length}</span>
          </div>
          <div className="inbox-stat">
            <span className="inbox-stat-label">Por revisar</span>
            <span className="inbox-stat-value text-sky-600 dark:text-sky-400">
              {reviewCount}
            </span>
          </div>
          <div className="inbox-stat">
            <span className="inbox-stat-label">En curso</span>
            <span className="inbox-stat-value text-teal-700 dark:text-teal-400">
              {activeCount}
            </span>
          </div>
          <div className="inbox-stat">
            <span className="inbox-stat-label">Sin leer</span>
            <span
              className={`inbox-stat-value ${
                totalUnread > 0
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {totalUnread}
            </span>
          </div>
        </div>
      )}

      <div
        className={`inbox-workspace-wrap ${
          channelFocusActive ? "inbox-workspace-wrap--focus" : ""
        }`}
      >
        <div className="inbox-workspace-toolbar">
          <ChannelFocusSelector
            value={workspace.channelFocus}
            onChange={workspace.setChannelFocus}
          />
          {channelFocusActive && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Vista optimizada para responder con máximo espacio en el chat.
            </p>
          )}
        </div>

        <section
          className={`inbox-workspace ${
            channelFocusActive ? "inbox-workspace--focus" : ""
          } ${!workspace.hydrated ? "inbox-workspace--hydrating" : ""}`}
          style={workspaceGridStyle}
        >
          {workspace.listCollapsed ? (
            <InboxDockTab
              side="left"
              label="Lista"
              onExpand={() => workspace.setListCollapsed(false)}
            />
          ) : (
            <InboxDockPanel
              title="Lista"
              side="left"
              onCollapse={() => workspace.setListCollapsed(true)}
              className="inbox-list-panel"
            >
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                onConversationPatch={patchConversation}
                filters={mergedFilters}
                onFiltersChange={setListFilters}
                channelFocusMode={channelFocusActive}
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
              title="Chat"
              side="center"
              onCollapse={() => workspace.setChatCollapsed(true)}
              className={`inbox-chat-panel ${
                channelFocusActive ? "inbox-chat-panel--focus" : ""
              }`}
            >
              <ChatThread
                conversation={selectedConversation}
                onConversationPatch={patchConversation}
                focusMode={channelFocusActive}
              />
            </InboxDockPanel>
          )}

          {workspace.contextCollapsed ? (
            <InboxDockTab
              side="right"
              label="CRM"
              onExpand={() => workspace.setContextCollapsed(false)}
            />
          ) : (
            <InboxDockPanel
              title="Contexto"
              side="right"
              onCollapse={() => workspace.setContextCollapsed(true)}
              className="inbox-context-panel"
            >
              <ConversationContextPanel
                conversation={selectedConversation}
                storeCountry={storeCountry}
                recentSales={recentSales}
                onConversationPatch={patchConversation}
                compact={channelFocusActive}
              />
            </InboxDockPanel>
          )}
        </section>
      </div>
    </div>
  );
}
