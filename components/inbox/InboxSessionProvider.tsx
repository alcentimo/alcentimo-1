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
import { fetchInboxContactCrm, markInboxConversationRead } from "@/lib/inbox/actions";
import { isMetaInboxProvider } from "@/components/inbox/MessengerChannelLabel";

interface InboxSessionContextValue {
  conversations: MessageConversation[];
  facebookConversations: MessageConversation[];
  selectedConversationId: string | null;
  selectedConversation: MessageConversation | null;
  listFilters: InboxListFilters;
  crmLoading: boolean;
  hasInitializedSelection: boolean;
  getDraft: (conversationId: string) => string;
  setDraft: (conversationId: string, value: string) => void;
  setListFilters: (
    value: InboxListFilters | ((current: InboxListFilters) => InboxListFilters),
  ) => void;
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
  const [crmLoading, setCrmLoading] = useState(false);
  const hasInitializedSelection = useRef(false);
  const crmRequestId = useRef(0);

  const facebookConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        isMetaInboxProvider(conversation.provider),
      ),
    [conversations],
  );

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

  const selectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);

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

      void markInboxConversationRead(conversationId).then((result) => {
        if (result.error) {
          console.error("[InboxSession] mark read error:", result.error);
        }
      });
    },
    [conversations, patchConversation],
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
    if (hasInitializedSelection.current) return;
    if (facebookConversations.length === 0) return;

    const preferred =
      facebookConversations.find((conversation) => conversation.unreadCount > 0)
        ?.conversationId ?? facebookConversations[0]?.conversationId;

    if (preferred) {
      setSelectedConversationId(preferred);
    }

    hasInitializedSelection.current = true;
  }, [facebookConversations]);

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
      facebookConversations,
      selectedConversationId,
      selectedConversation,
      listFilters,
      crmLoading,
      hasInitializedSelection: hasInitializedSelection.current,
      getDraft,
      setDraft,
      setListFilters,
      selectConversation,
      patchConversation,
      applyConversationPatch,
    }),
    [
      conversations,
      facebookConversations,
      selectedConversationId,
      selectedConversation,
      listFilters,
      crmLoading,
      getDraft,
      setDraft,
      setListFilters,
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
