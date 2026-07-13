"use client";

import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import { ConversationQuickActions } from "@/components/inbox/ConversationQuickActions";
import { ContactAvatar } from "@/components/inbox/ContactAvatar";
import { useInboxSession } from "@/components/inbox/InboxSessionProvider";
import { filterConversations } from "@/lib/inbox/inbox-filters";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

export function ConversationList() {
  const {
    conversations,
    selectedConversationId,
    listFilters,
    listLoading,
    listError,
    selectConversation,
    refreshInboxContacts,
  } = useInboxSession();

  useEffect(() => {
    void refreshInboxContacts();
  }, [refreshInboxContacts]);

  const visibleConversations = useMemo(
    () =>
      filterConversations(
        conversations,
        listFilters,
        formatSenderLabel,
      ),
    [conversations, listFilters],
  );

  if (listLoading && conversations.length === 0) {
    return (
      <div className="inbox-pro-conversation-loading" role="status">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
        <span>Cargando contactos…</span>
      </div>
    );
  }

  if (listError && conversations.length === 0) {
    return (
      <div className="inbox-pro-conversation-empty px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        <button
          type="button"
          onClick={() => void refreshInboxContacts()}
          className="mt-3 text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <ul className="inbox-pro-conversation-list" aria-label="Conversaciones">
      {visibleConversations.length === 0 ? (
        <li className="inbox-pro-conversation-empty">
          {conversations.length === 0
            ? "No hay contactos en el inbox todavía."
            : "Sin resultados para esta búsqueda."}
        </li>
      ) : (
        visibleConversations.map((conversation) => {
          const isActive =
            conversation.conversationId === selectedConversationId;
          const isUnread = conversation.unreadCount > 0;
          const preview =
            conversation.lastMessage?.trim() || "Sin mensajes aún";
          const customerLabel = formatSenderLabel(
            conversation.senderId,
            conversation.displayName,
          );

          return (
            <li key={conversation.conversationId} className="group">
              <button
                type="button"
                onClick={() => selectConversation(conversation.conversationId)}
                className={cn(
                  "inbox-pro-conversation-item",
                  isActive && "inbox-pro-conversation-item--active",
                  isUnread && "inbox-pro-conversation-item--unread",
                )}
              >
                <ContactAvatar
                  avatarUrl={conversation.avatarUrl}
                  displayName={conversation.displayName}
                  senderId={conversation.senderId}
                  provider={conversation.provider}
                  size="md"
                  className="shrink-0"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inbox-pro-conversation-name truncate",
                        isUnread && "inbox-pro-conversation-name--unread",
                      )}
                    >
                      {customerLabel}
                    </span>
                    <span className="inbox-pro-conversation-time shrink-0 tabular-nums">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  </span>

                  <span className="mt-1 flex items-center gap-2">
                    <span className="inbox-pro-conversation-preview truncate">
                      {preview}
                    </span>
                    {isUnread && (
                      <Badge className="min-w-5 shrink-0 justify-center px-1.5">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </span>
                </span>

                <ConversationQuickActions conversation={conversation} />
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}
