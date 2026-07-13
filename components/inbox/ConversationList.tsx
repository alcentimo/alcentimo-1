"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import {
  getConversationStatusLabel,
  getConversationStatusTone,
} from "@/components/inbox/conversation-status";

export type InboxFilter = "all" | "unread" | "priority";

interface ConversationListProps {
  conversations: MessageConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: MessageConversation) => void;
}

function matchesSearch(conversation: MessageConversation, query: string): boolean {
  const haystack = [
    formatSenderLabel(conversation.senderId, conversation.displayName),
    conversation.senderId,
    conversation.phoneE164,
    conversation.lastMessage,
    conversation.tags.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (conversation.isArchived || conversation.isSpam) return false;
      if (activeFilter === "unread" && conversation.unreadCount === 0) {
        return false;
      }
      if (activeFilter === "priority" && !conversation.isPriority) {
        return false;
      }
      if (query && !matchesSearch(conversation, query)) return false;
      return true;
    });
  }, [activeFilter, conversations, searchQuery]);

  const filters: { key: InboxFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "unread", label: "No leídos" },
    { key: "priority", label: "Prioritarios" },
  ];

  return (
    <aside className="flex min-h-0 flex-col border-b border-zinc-200/90 dark:border-zinc-800 lg:border-b-0 lg:border-r">
      <div className="space-y-3 border-b border-zinc-200/90 px-4 py-4 dark:border-zinc-800 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Conversaciones
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {filteredConversations.length} activas
          </p>
        </div>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar cliente o mensaje"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-950/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="inbox-conversation-list" aria-label="Lista de conversaciones">
        {filteredConversations.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay conversaciones con este filtro.
          </li>
        ) : (
          filteredConversations.map((conversation) => {
            const isActive =
              conversation.conversationId === selectedConversationId;
            const preview =
              conversation.lastMessage?.trim() || "Mensaje sin texto";
            const customerLabel = formatSenderLabel(
              conversation.senderId,
              conversation.displayName,
            );

            return (
              <li key={conversation.conversationId}>
                <button
                  type="button"
                  onClick={() => onSelectConversation(conversation)}
                  className={`inbox-conversation-item ${
                    isActive ? "inbox-conversation-item-active" : ""
                  }`}
                >
                  <ChannelLogo
                    provider={conversation.provider}
                    className="h-10 w-10 shrink-0"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {customerLabel}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatMessageTime(conversation.lastMessageAt)}
                      </span>
                    </span>

                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {preview}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </span>

                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getConversationStatusTone(conversation.status)}`}
                      >
                        {getConversationStatusLabel(conversation.status)}
                      </span>
                      {conversation.isPriority && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Prioritario
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
