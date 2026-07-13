"use client";

import { useMemo } from "react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { ConversationQuickActions } from "@/components/inbox/ConversationQuickActions";
import {
  filterConversations,
  type InboxListFilters,
} from "@/lib/inbox/inbox-filters";

interface ConversationListProps {
  conversations: MessageConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: MessageConversation) => void;
  onConversationPatch: (
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) => void;
  filters: InboxListFilters;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onConversationPatch,
  filters,
}: ConversationListProps) {
  const filteredConversations = useMemo(
    () => filterConversations(conversations, filters, formatSenderLabel),
    [conversations, filters],
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
                onClick={() => onSelectConversation(conversation)}
                className={`inbox-conversation-item-compact ${
                  isActive ? "inbox-conversation-item-compact-active" : ""
                } ${isUnread ? "inbox-conversation-item-compact-unread" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={`min-w-0 flex-1 truncate text-[13px] leading-tight ${
                        isUnread
                          ? "font-semibold text-slate-900 dark:text-slate-50"
                          : "font-medium text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {customerLabel}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  </span>

                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-slate-400">
                      {preview}
                    </span>
                    {isUnread && (
                      <span className="inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-[#1877F2] px-1 py-0.5 text-[9px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </span>
                </span>

                <ConversationQuickActions
                  conversation={conversation}
                  onPatch={(patch) =>
                    onConversationPatch(conversation.conversationId, patch)
                  }
                />
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}
