"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Flag,
  MoreHorizontal,
  UserRound,
} from "lucide-react";
import {
  archiveInboxConversation,
  assignInboxConversationTeam,
  markInboxConversationSpam,
} from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";

const TEAM_OPTIONS = [
  { value: "ventas", label: "Ventas" },
  { value: "soporte", label: "Soporte" },
  { value: "logistica", label: "Logística" },
] as const;

interface MessageActionMenuProps {
  conversationId: string;
  onActionComplete?: (patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) => void;
}

export function MessageActionMenu({
  conversationId,
  onActionComplete,
}: MessageActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canPersist = isPersistedConversation(conversationId);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setShowTeams(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function runAction(
    action: () => Promise<{ error?: string }>,
    patch: {
      isArchived?: boolean;
      isSpam?: boolean;
      assignedTeam?: string | null;
    },
  ) {
    if (!canPersist) return;

    setPending(true);
    const result = await action();
    setPending(false);
    setOpen(false);
    setShowTeams(false);

    if (result.error) {
      console.error("[MessageActionMenu]", result.error);
      return;
    }

    onActionComplete?.(patch);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Acciones del mensaje"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
          <button
            type="button"
            disabled={pending || !canPersist}
            onClick={() =>
              runAction(
                () => archiveInboxConversation(conversationId),
                { isArchived: true },
              )
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archivar
          </button>
          <button
            type="button"
            disabled={pending || !canPersist}
            onClick={() =>
              runAction(
                () => markInboxConversationSpam(conversationId),
                { isSpam: true },
              )
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Marcar como spam
          </button>
          <button
            type="button"
            disabled={pending || !canPersist}
            onClick={() => setShowTeams((current) => !current)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Asignar a equipo
          </button>

          {showTeams && (
            <div className="border-t border-zinc-100 py-1 dark:border-zinc-800">
              {TEAM_OPTIONS.map((team) => (
                <button
                  key={team.value}
                  type="button"
                  disabled={pending || !canPersist}
                  onClick={() =>
                    runAction(
                      () =>
                        assignInboxConversationTeam(
                          conversationId,
                          team.value,
                        ),
                      { assignedTeam: team.value },
                    )
                  }
                  className="flex w-full px-4 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {team.label}
                </button>
              ))}
            </div>
          )}

          {!canPersist && (
            <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
              Acciones disponibles tras sincronizar el inbox.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
