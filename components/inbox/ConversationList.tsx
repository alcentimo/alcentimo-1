"use client";

import { useMemo } from "react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import { ConversationQuickActions } from "@/components/inbox/ConversationQuickActions";
import { ContactAvatar } from "@/components/inbox/ContactAvatar";
import { useInboxSession } from "@/components/inbox/InboxSessionProvider";
import {
  filterConversations,
} from "@/lib/inbox/inbox-filters";

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
    <ul className="inbox-conversation-list-compact" aria-label="Conversaciones de Facebook">
      {filteredConversations.length === 0 ? (
        <li className="px-3 py-10 text-center text-[11px] text-slate-400 dark:text-slate-500">
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
                className={`inbox-conversation-item-compact ${
                  isActive ? "inbox-conversation-item-compact-active" : ""
                } ${isUnread ? "inbox-conversation-item-compact-unread" : ""}`}
              >
                <ContactAvatar
                  avatarUrl={conversation.avatarUrl}
                  displayName={conversation.displayName}
                  senderId={conversation.senderId}
                  provider={conversation.provider}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={`inbox-conversation-name min-w-0 flex-1 truncate text-[13px] leading-tight ${
                        isUnread ? "inbox-conversation-name--unread" : ""
                      }`}
                    >
                      {customerLabel}
                    </span>
                    <span className="inbox-conversation-time shrink-0 text-[11px] tabular-nums">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  </span>

                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="inbox-conversation-preview min-w-0 flex-1 truncate text-[12px] leading-tight">
                      {preview}
                    </span>
                    {isUnread && (
                      <span className="inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-[#1877F2] px-1 py-0.5 text-[9px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
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
