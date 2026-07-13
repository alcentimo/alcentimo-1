"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { ChannelBadge } from "@/components/inbox/ChannelBadge";
import { ConversationQuickActions } from "@/components/inbox/ConversationQuickActions";
import {
  countSmartTab,
  DEFAULT_INBOX_FILTERS,
  filterConversations,
  type InboxChannelFilter,
  type InboxListFilters,
  type InboxPriorityFilter,
  type InboxSmartTab,
  type InboxStatusFilter,
} from "@/lib/inbox/inbox-filters";

interface ConversationListProps {
  conversations: MessageConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: MessageConversation) => void;
  onConversationPatch: (
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) => void;
}

const CHANNEL_OPTIONS: { value: InboxChannelFilter; label: string }[] = [
  { value: "all", label: "Todos los canales" },
  { value: "messenger", label: "Facebook (FB)" },
  { value: "instagram", label: "Instagram (IG)" },
  { value: "mercadolibre", label: "MercadoLibre (ML)" },
  { value: "whatsapp", label: "WhatsApp (WA)" },
];

const STATUS_OPTIONS: { value: InboxStatusFilter; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "new", label: "Nuevo" },
  { value: "open", label: "Abierta" },
  { value: "pending", label: "Pendiente" },
  { value: "resolved", label: "Resuelto" },
];

const PRIORITY_OPTIONS: { value: InboxPriorityFilter; label: string }[] = [
  { value: "all", label: "Toda prioridad" },
  { value: "priority", label: "Prioritarios" },
  { value: "normal", label: "Normal" },
];

const SMART_TABS: { key: InboxSmartTab; label: string }[] = [
  { key: "review", label: "Por revisar" },
  { key: "active", label: "En curso" },
];

function updateFilter<K extends keyof InboxListFilters>(
  current: InboxListFilters,
  key: K,
  value: InboxListFilters[K],
): InboxListFilters {
  return { ...current, [key]: value };
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onConversationPatch,
}: ConversationListProps) {
  const [filters, setFilters] = useState<InboxListFilters>(DEFAULT_INBOX_FILTERS);

  const filteredConversations = useMemo(
    () => filterConversations(conversations, filters, formatSenderLabel),
    [conversations, filters],
  );

  const reviewCount = useMemo(
    () => countSmartTab(conversations, "review"),
    [conversations],
  );
  const activeCount = useMemo(
    () => countSmartTab(conversations, "active"),
    [conversations],
  );

  return (
    <aside className="inbox-list-panel">
      <div className="inbox-list-toolbar">
        <div className="inbox-smart-tabs" role="tablist" aria-label="Bandeja inteligente">
          {SMART_TABS.map((tab) => {
            const isActive = filters.smartTab === tab.key;
            const count = tab.key === "review" ? reviewCount : activeCount;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setFilters((current) => updateFilter(current, "smartTab", tab.key))
                }
                className={`inbox-smart-tab ${isActive ? "inbox-smart-tab-active" : ""}`}
              >
                <span>{tab.label}</span>
                <span className="inbox-smart-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.searchQuery}
            onChange={(event) =>
              setFilters((current) =>
                updateFilter(current, "searchQuery", event.target.value),
              )
            }
            placeholder="Buscar…"
            className="inbox-search-input"
          />
        </label>

        <div className="inbox-filter-bar">
          <select
            value={filters.channel}
            onChange={(event) =>
              setFilters((current) =>
                updateFilter(
                  current,
                  "channel",
                  event.target.value as InboxChannelFilter,
                ),
              )
            }
            className="inbox-filter-select"
            aria-label="Filtrar por canal"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) =>
                updateFilter(
                  current,
                  "status",
                  event.target.value as InboxStatusFilter,
                ),
              )
            }
            className="inbox-filter-select"
            aria-label="Filtrar por estado"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) =>
                updateFilter(
                  current,
                  "priority",
                  event.target.value as InboxPriorityFilter,
                ),
              )
            }
            className="inbox-filter-select"
            aria-label="Filtrar por prioridad"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {filteredConversations.length} conversaciones
        </p>
      </div>

      <ul className="inbox-conversation-list-compact" aria-label="Lista de conversaciones">
        {filteredConversations.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No hay conversaciones con estos filtros.
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
                  <ChannelBadge provider={conversation.provider} showLabel />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] leading-tight ${
                          isUnread
                            ? "font-bold text-zinc-900 dark:text-zinc-50"
                            : "font-medium text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {customerLabel}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {formatMessageTime(conversation.lastMessageAt)}
                      </span>
                    </span>

                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs leading-tight text-zinc-500 dark:text-zinc-400">
                        {preview}
                      </span>
                      {isUnread && (
                        <span className="inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 px-1 py-0.5 text-[9px] font-bold text-white">
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
    </aside>
  );
}
