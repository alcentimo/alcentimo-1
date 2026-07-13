import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { InboxProvider } from "@/lib/inbox/types";

export type InboxSmartTab = "all" | "review" | "active";

export type InboxChannelFilter = "all" | InboxProvider;

export type InboxStatusFilter = "all" | "new" | "open" | "pending" | "resolved";

export type InboxPriorityFilter = "all" | "priority" | "normal";

export interface InboxListFilters {
  smartTab: InboxSmartTab;
  channel: InboxChannelFilter;
  status: InboxStatusFilter;
  priority: InboxPriorityFilter;
  searchQuery: string;
}

export const DEFAULT_INBOX_FILTERS: InboxListFilters = {
  smartTab: "all",
  channel: "all",
  status: "all",
  priority: "all",
  searchQuery: "",
};

export function matchesSearch(
  conversation: MessageConversation,
  query: string,
  formatSenderLabel: (senderId: string, displayName?: string | null) => string,
): boolean {
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

export function matchesSmartTab(
  conversation: MessageConversation,
  tab: InboxSmartTab,
): boolean {
  if (tab === "all") return true;
  if (conversation.isArchived || conversation.isSpam) return false;

  if (tab === "review") {
    return conversation.unreadCount > 0;
  }

  return conversation.status === "open" || conversation.status === "pending";
}

export function matchesChannelFilter(
  conversation: MessageConversation,
  channel: InboxChannelFilter,
): boolean {
  if (channel === "all") return true;
  return conversation.provider === channel;
}

export function matchesStatusFilter(
  conversation: MessageConversation,
  status: InboxStatusFilter,
): boolean {
  if (status === "all") return true;
  if (status === "new") return conversation.unreadCount > 0;
  if (status === "open") return conversation.status === "open";
  if (status === "pending") return conversation.status === "pending";
  if (status === "resolved") return conversation.status === "closed";
  return true;
}

export function matchesPriorityFilter(
  conversation: MessageConversation,
  priority: InboxPriorityFilter,
): boolean {
  if (priority === "all") return true;
  if (priority === "priority") return conversation.isPriority;
  return !conversation.isPriority;
}

export function filterConversations(
  conversations: MessageConversation[],
  filters: InboxListFilters,
  formatSenderLabel: (senderId: string, displayName?: string | null) => string,
): MessageConversation[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return conversations.filter((conversation) => {
    if (filters.smartTab !== "all" && (conversation.isArchived || conversation.isSpam)) {
      return false;
    }
    if (!matchesSmartTab(conversation, filters.smartTab)) return false;
    if (!matchesChannelFilter(conversation, filters.channel)) return false;
    if (!matchesStatusFilter(conversation, filters.status)) return false;
    if (!matchesPriorityFilter(conversation, filters.priority)) return false;
    if (query && !matchesSearch(conversation, query, formatSenderLabel)) {
      return false;
    }
    return true;
  });
}

export function countSmartTab(
  conversations: MessageConversation[],
  tab: InboxSmartTab,
): number {
  return conversations.filter(
    (conversation) =>
      !conversation.isArchived &&
      !conversation.isSpam &&
      matchesSmartTab(conversation, tab),
  ).length;
}

export function isConversationInProgress(
  conversation: MessageConversation,
): boolean {
  return (
    !conversation.isArchived &&
    !conversation.isSpam &&
    (conversation.status === "open" || conversation.status === "pending")
  );
}
