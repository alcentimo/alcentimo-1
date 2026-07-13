"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ComposerCatalogProduct } from "@/lib/inbox/composer-catalog-types";
import {
  buildComposerCommandGroups,
  extractSlashQuery,
  filterComposerCommandGroups,
  flattenComposerCommands,
  isSlashPaletteDraft,
  type ComposerCommand,
} from "@/lib/inbox/composer-commands";
import { ComposerSlashMenu } from "@/components/inbox/ComposerSlashMenu";

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend?: (text: string) => void;
  onSlashMenuOpenChange?: (open: boolean) => void;
  catalogProducts?: ComposerCatalogProduct[];
  sendEnabled?: boolean;
}

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onSlashMenuOpenChange,
  catalogProducts = [],
  sendEnabled = true,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);

  const slashMenuOpen = isSlashPaletteDraft(draft);
  const slashQuery = extractSlashQuery(draft);

  const commandGroups = useMemo(
    () => buildComposerCommandGroups(catalogProducts),
    [catalogProducts],
  );

  const filteredGroups = useMemo(
    () => filterComposerCommandGroups(commandGroups, slashQuery),
    [commandGroups, slashQuery],
  );

  const flatCommands = useMemo(
    () => flattenComposerCommands(filteredGroups),
    [filteredGroups],
  );

  useEffect(() => {
    onSlashMenuOpenChange?.(slashMenuOpen);
  }, [slashMenuOpen, onSlashMenuOpenChange]);

  useEffect(() => {
    if (!slashMenuOpen) {
      setSlashActiveIndex(0);
      return;
    }

    setSlashActiveIndex((current) =>
      Math.min(current, Math.max(0, flatCommands.length - 1)),
    );
  }, [slashMenuOpen, flatCommands.length, slashQuery]);

  function focusTextarea() {
    textareaRef.current?.focus();
  }

  function selectSlashCommand(command: ComposerCommand) {
    onDraftChange(command.snippet);
    setSlashActiveIndex(0);
    focusTextarea();
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || !sendEnabled || slashMenuOpen) return;
    onSend?.(text);
    focusTextarea();
  }

  function handleTextareaKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (slashMenuOpen) {
      if (flatCommands.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashActiveIndex((current) =>
            Math.min(current + 1, flatCommands.length - 1),
          );
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashActiveIndex((current) => Math.max(current - 1, 0));
          return;
        }

        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          const command = flatCommands[slashActiveIndex];
          if (command) selectSlashCommand(command);
          return;
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onDraftChange("");
        return;
      }
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  }

  const canSend =
    sendEnabled && draft.trim().length > 0 && !slashMenuOpen;

  return (
    <footer className="inbox-chat-composer-wrap">
      <div className="inbox-chat-composer">
        <div className="flex items-end gap-2">
          <div className="inbox-composer-field">
            {slashMenuOpen && (
              <ComposerSlashMenu
                groups={filteredGroups}
                flatCommands={flatCommands}
                activeIndex={slashActiveIndex}
                onActiveIndexChange={setSlashActiveIndex}
                onSelect={selectSlashCommand}
              />
            )}

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              rows={2}
              placeholder="Escribe tu mensaje…  / para comandos"
              className="inbox-chat-composer-input"
              aria-label="Mensaje de respuesta"
              aria-expanded={slashMenuOpen}
              aria-haspopup="listbox"
            />
          </div>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="btn-brand inbox-chat-composer-send"
            title="Enviar (Ctrl+Enter)"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
