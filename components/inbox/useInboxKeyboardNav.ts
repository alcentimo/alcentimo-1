"use client";

import { useEffect, useRef } from "react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }

  return target.isContentEditable;
}

interface UseInboxKeyboardNavOptions {
  conversations: MessageConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: MessageConversation) => void;
  enabled?: boolean;
  blocked?: boolean;
}

export function useInboxKeyboardNav({
  conversations,
  selectedConversationId,
  onSelectConversation,
  enabled = true,
  blocked = false,
}: UseInboxKeyboardNavOptions) {
  const conversationsRef = useRef(conversations);
  const selectedIdRef = useRef(selectedConversationId);
  const onSelectRef = useRef(onSelectConversation);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    onSelectRef.current = onSelectConversation;
  }, [onSelectConversation]);

  useEffect(() => {
    if (!enabled || blocked) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (isEditableTarget(event.target)) return;

      const list = conversationsRef.current;
      if (list.length === 0) return;

      const currentIndex = list.findIndex(
        (conversation) =>
          conversation.conversationId === selectedIdRef.current,
      );
      const startIndex = currentIndex === -1 ? 0 : currentIndex;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.min(
        list.length - 1,
        Math.max(0, startIndex + delta),
      );

      if (nextIndex === startIndex && currentIndex !== -1) return;

      event.preventDefault();
      onSelectRef.current(list[nextIndex]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, blocked]);
}
