"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { markInboxConversationRead } from "@/lib/inbox/actions";
import { countSmartTab } from "@/lib/inbox/inbox-filters";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatThread } from "@/components/inbox/ChatThread";
import { ConversationContextPanel } from "@/components/inbox/ConversationContextPanel";
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
  const [crmCollapsed, setCrmCollapsed] = useState(false);
  const [, startTransition] = useTransition();

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

      <section
        className={`inbox-shell ${crmCollapsed ? "inbox-shell--crm-collapsed" : ""}`}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onConversationPatch={patchConversation}
        />

        <div className="relative flex min-h-0 min-w-0 flex-col bg-zinc-50/70 dark:bg-zinc-900/20">
          <button
            type="button"
            onClick={() => setCrmCollapsed((current) => !current)}
            className="inbox-crm-toggle"
            title={crmCollapsed ? "Mostrar datos del cliente" : "Ocultar panel CRM"}
            aria-label={crmCollapsed ? "Mostrar datos del cliente" : "Ocultar panel CRM"}
          >
            {crmCollapsed ? (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <ChatThread
            conversation={selectedConversation}
            onConversationPatch={patchConversation}
          />
        </div>

        {!crmCollapsed && (
          <ConversationContextPanel
            conversation={selectedConversation}
            storeCountry={storeCountry}
            recentSales={recentSales}
            onConversationPatch={patchConversation}
            onCollapse={() => setCrmCollapsed(true)}
          />
        )}
      </section>
    </div>
  );
}
