"use client";

import { useState, type MouseEvent } from "react";
import { Archive, UserRound } from "lucide-react";
import {
  archiveInboxConversation,
  assignInboxConversationTeam,
} from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";

const TEAM_OPTIONS = [
  { value: "ventas", label: "Ventas" },
  { value: "soporte", label: "Soporte" },
  { value: "logistica", label: "Logística" },
] as const;

interface ConversationQuickActionsProps {
  conversation: MessageConversation;
  onPatch: (patch: Partial<MessageConversation>) => void;
}

export function ConversationQuickActions({
  conversation,
  onPatch,
}: ConversationQuickActionsProps) {
  const [pending, setPending] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const canPersist = isPersistedConversation(conversation.conversationId);

  async function handleArchive(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!canPersist) return;

    setPending(true);
    const result = await archiveInboxConversation(conversation.conversationId);
    setPending(false);

    if (result.error) {
      console.error("[ConversationQuickActions]", result.error);
      return;
    }

    onPatch({ isArchived: true });
  }

  async function handleAssign(
    event: MouseEvent<HTMLButtonElement>,
    team: (typeof TEAM_OPTIONS)[number]["value"],
  ) {
    event.stopPropagation();
    if (!canPersist) return;

    setPending(true);
    const result = await assignInboxConversationTeam(
      conversation.conversationId,
      team,
    );
    setPending(false);
    setShowTeams(false);

    if (result.error) {
      console.error("[ConversationQuickActions]", result.error);
      return;
    }

    onPatch({ assignedTeam: team });
  }

  return (
    <div
      className="inbox-quick-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={pending || !canPersist}
        onClick={handleArchive}
        className="inbox-quick-action-btn"
        title="Archivar"
        aria-label="Archivar conversación"
      >
        <Archive className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          disabled={pending || !canPersist}
          onClick={(event) => {
            event.stopPropagation();
            setShowTeams((current) => !current);
          }}
          className="inbox-quick-action-btn"
          title="Asignar"
          aria-label="Asignar a equipo"
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {showTeams && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[7.5rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
            {TEAM_OPTIONS.map((team) => (
              <button
                key={team.value}
                type="button"
                disabled={pending}
                onClick={(event) => handleAssign(event, team.value)}
                className="flex w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {team.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
