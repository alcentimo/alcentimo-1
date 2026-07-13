"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { markInboxConversationRead } from "@/lib/inbox/actions";
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Conversaciones
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {conversations.length}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Clientes con mensajes activos
              </p>
            </div>
          </div>
        </article>

        <article className="kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Sin leer
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {totalUnread}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  totalUnread > 0
                    ? "text-sky-700 dark:text-sky-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {totalUnread > 0
                  ? "Requieren tu atención"
                  : "Bandeja al día"}
              </p>
            </div>
          </div>
        </article>
      </div>

      <section className="inbox-shell">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />

        <div className="flex min-h-[28rem] min-w-0 flex-col bg-zinc-50/70 dark:bg-zinc-900/20">
          <ChatThread
            conversation={selectedConversation}
            onConversationPatch={patchConversation}
          />
        </div>

        <ConversationContextPanel
          conversation={selectedConversation}
          storeCountry={storeCountry}
          recentSales={recentSales}
          onConversationPatch={patchConversation}
        />
      </section>
    </div>
  );
}
