"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import {
  DEFAULT_INBOX_FILTERS,
  type InboxListFilters,
} from "@/lib/inbox/inbox-filters";
import {
  fetchInboxContactCrm,
  fetchInboxContactsList,
  fetchInboxConversationMessages,
  markInboxConversationRead,
} from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";

interface InboxSessionContextValue {
  conversations: MessageConversation[];
  selectedConversationId: string | null;
  selectedConversation: MessageConversation | null;
  listFilters: InboxListFilters;
  listLoading: boolean;
  listError: string | null;
  messagesLoadingId: string | null;
  crmLoading: boolean;
  getDraft: (conversationId: string) => string;
  setDraft: (conversationId: string, value: string) => void;
  setListFilters: (
    value: InboxListFilters | ((current: InboxListFilters) => InboxListFilters),
  ) => void;
  refreshInboxContacts: () => Promise<void>;
  selectConversation: (conversationId: string) => void;
  patchConversation: (
    conversationId: string,
    patch:
      | Partial<MessageConversation>
      | ((current: MessageConversation) => Partial<MessageConversation>),
  ) => void;
  applyConversationPatch: (
    conversationId: string,
    optimisticPatch: Partial<MessageConversation>,
    persist: () => Promise<{ error?: string }>,
  ) => Promise<void>;
}

const InboxSessionContext = createContext<InboxSessionContextValue | null>(null);

interface InboxSessionProviderProps {
  initialConversations: MessageConversation[];
  children: ReactNode;
}

export function InboxSessionProvider({
  initialConversations,
  children,
}: InboxSessionProviderProps) {
  const [conversations, setConversations] =
    useState<MessageConversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [listFilters, setListFiltersState] =
    useState<InboxListFilters>(DEFAULT_INBOX_FILTERS);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [messagesLoadingId, setMessagesLoadingId] = useState<string | null>(
    null,
  );
  const [crmLoading, setCrmLoading] = useState(false);
  const crmRequestId = useRef(0);
  const messagesRequestId = useRef(0);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.conversationId === selectedConversationId,
      ) ?? null,
    [conversations, selectedConversationId],
  );

  const patchConversation = useCallback(
    (
      conversationId: string,
      patch:
        | Partial<MessageConversation>
        | ((current: MessageConversation) => Partial<MessageConversation>),
    ) => {
      setConversations((current) =>
        current.map((item) => {
          if (item.conversationId !== conversationId) return item;
          const resolvedPatch =
            typeof patch === "function" ? patch(item) : patch;
          return { ...item, ...resolvedPatch };
        }),
      );
    },
    [],
  );

  const setListFilters = useCallback(
    (
      value: InboxListFilters | ((current: InboxListFilters) => InboxListFilters),
    ) => {
      setListFiltersState((current) =>
        typeof value === "function" ? value(current) : value,
      );
    },
    [],
  );

  const getDraft = useCallback(
    (conversationId: string) => drafts[conversationId] ?? "",
    [drafts],
  );

  const setDraft = useCallback((conversationId: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [conversationId]: value,
    }));
  }, []);

  const refreshInboxContacts = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    const result = await fetchInboxContactsList();

    setListLoading(false);

    if (result.error) {
      setListError(result.error);
      console.error("[InboxSession] contacts load error:", result.error);
      return;
    }

    if (result.conversations) {
      setConversations(result.conversations);
    }
  }, []);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!isPersistedConversation(conversationId)) {
        setMessagesLoadingId(null);
        return;
      }

      const requestId = ++messagesRequestId.current;
      setMessagesLoadingId(conversationId);

      const result = await fetchInboxConversationMessages(conversationId);

      if (requestId !== messagesRequestId.current) return;

      setMessagesLoadingId(null);

      if (result.error) {
        console.error("[InboxSession] messages load error:", result.error);
        return;
      }

      if (result.messages) {
        patchConversation(conversationId, { messages: result.messages });
      }
    },
    [patchConversation],
  );

  const selectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);

      void loadConversationMessages(conversationId);

      const conversation = conversations.find(
        (item) => item.conversationId === conversationId,
      );
      if (!conversation || conversation.unreadCount === 0) return;

      patchConversation(conversationId, {
        unreadCount: 0,
        messages: conversation.messages.map((message) =>
          message.direction === "inbound" && message.status === "unread"
            ? { ...message, status: "read" as const }
            : message,
        ),
      });

      if (!isPersistedConversation(conversationId)) return;

      void markInboxConversationRead(conversationId).then((result) => {
        if (result.error) {
          console.error("[InboxSession] mark read error:", result.error);
        }
      });
    },
    [conversations, loadConversationMessages, patchConversation],
  );

  const applyConversationPatch = useCallback(
    async (
      conversationId: string,
      optimisticPatch: Partial<MessageConversation>,
      persist: () => Promise<{ error?: string }>,
    ) => {
      const previous = conversations.find(
        (item) => item.conversationId === conversationId,
      );
      if (!previous) return;

      patchConversation(conversationId, optimisticPatch);

      const result = await persist();
      if (result.error) {
        console.error("[InboxSession] action rollback:", result.error);
        patchConversation(conversationId, previous);
      }
    },
    [conversations, patchConversation],
  );

  useEffect(() => {
    if (conversations.length === 0) return;

    if (
      selectedConversationId &&
      conversations.some(
        (conversation) =>
          conversation.conversationId === selectedConversationId,
      )
    ) {
      return;
    }

    const preferred =
      conversations.find((conversation) => conversation.unreadCount > 0)
        ?.conversationId ?? conversations[0]?.conversationId;

    if (preferred) {
      setSelectedConversationId(preferred);
      void loadConversationMessages(preferred);
    }
  }, [conversations, selectedConversationId, loadConversationMessages]);

  useEffect(() => {
    const contactId = selectedConversation?.contactId;
    if (!selectedConversationId || !contactId) {
      setCrmLoading(false);
      return;
    }

    const requestId = ++crmRequestId.current;
    setCrmLoading(true);

    void fetchInboxContactCrm(contactId).then((result) => {
      if (requestId !== crmRequestId.current) return;

      setCrmLoading(false);

      if (result.error) {
        console.error("[InboxSession] CRM load error:", result.error);
        return;
      }

      if (!result.data) return;

      patchConversation(selectedConversationId, {
        privateNotes: result.data.privateNotes,
        tags: result.data.tags,
      });
    });
  }, [selectedConversationId, selectedConversation?.contactId, patchConversation]);

  const value = useMemo<InboxSessionContextValue>(
    () => ({
      conversations,
      selectedConversationId,
      selectedConversation,
      listFilters,
      listLoading,
      listError,
      messagesLoadingId,
      crmLoading,
      getDraft,
      setDraft,
      setListFilters,
      refreshInboxContacts,
      selectConversation,
      patchConversation,
      applyConversationPatch,
    }),
    [
      conversations,
      selectedConversationId,
      selectedConversation,
      listFilters,
      listLoading,
      listError,
      messagesLoadingId,
      crmLoading,
      getDraft,
      setDraft,
      setListFilters,
      refreshInboxContacts,
      selectConversation,
      patchConversation,
      applyConversationPatch,
    ],
  );

  return (
    <InboxSessionContext.Provider value={value}>
      {children}
    </InboxSessionContext.Provider>
  );
}

export function useInboxSession(): InboxSessionContextValue {
  const context = useContext(InboxSessionContext);
  if (!context) {
    throw new Error("useInboxSession debe usarse dentro de InboxSessionProvider.");
  }
  return context;
}
