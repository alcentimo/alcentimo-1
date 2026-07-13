"use client";

import { useMemo } from "react";
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
    facebookConversations,
    selectedConversationId,
    listFilters,
    selectConversation,
  } = useInboxSession();

  const filteredConversations = useMemo(
    () =>
      filterConversations(
        facebookConversations,
        listFilters,
        formatSenderLabel,
      ),
    [facebookConversations, listFilters],
  );

  return (
    <ul className="inbox-pro-conversation-list" aria-label="Conversaciones">
      {filteredConversations.length === 0 ? (
        <li className="inbox-pro-conversation-empty">
          Sin conversaciones con estos filtros.
        </li>
      ) : (
        filteredConversations.map((conversation) => {
          const isActive =
            conversation.conversationId === selectedConversationId;
          const isUnread = conversation.unreadCount > 0;
          const preview =
            conversation.lastMessage?.trim() || "Mensaje sin texto";
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
