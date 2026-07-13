"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  COMPOSER_COMMANDS,
  extractSlashQuery,
  filterComposerCommands,
  isSlashPaletteDraft,
  type ComposerCommand,
} from "@/lib/inbox/composer-commands";
import { ComposerSlashMenu } from "@/components/inbox/ComposerSlashMenu";

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend?: (text: string) => void;
  onSlashMenuOpenChange?: (open: boolean) => void;
  sendEnabled?: boolean;
}

export function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  onSlashMenuOpenChange,
  sendEnabled = true,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [sendShortcutLabel, setSendShortcutLabel] = useState("Ctrl+↵");

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setSendShortcutLabel(isMac ? "⌘↵" : "Ctrl+↵");
  }, []);

  const slashMenuOpen = isSlashPaletteDraft(draft);
  const slashQuery = extractSlashQuery(draft);
  const filteredCommands = useMemo(
    () => filterComposerCommands(slashQuery),
    [slashQuery],
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
      Math.min(current, Math.max(0, filteredCommands.length - 1)),
    );
  }, [slashMenuOpen, filteredCommands.length, slashQuery]);

  function focusTextarea() {
    textareaRef.current?.focus();
  }

  function applySnippet(snippet: string) {
    onDraftChange(draft.trim() ? `${draft.trim()}\n\n${snippet}` : snippet);
    focusTextarea();
  }

  function selectSlashCommand(command: ComposerCommand) {
    onDraftChange(command.snippet);
    setSlashActiveIndex(0);
    focusTextarea();
  }

  function handleSend() {
    const text = draft.trim();
    if (!text || !sendEnabled) return;
    onSend?.(text);
    focusTextarea();
  }

  function handleTextareaKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (slashMenuOpen && filteredCommands.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashActiveIndex((current) =>
          Math.min(current + 1, filteredCommands.length - 1),
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
        const command = filteredCommands[slashActiveIndex];
        if (command) selectSlashCommand(command);
        return;
      }
    }

    if (event.key === "Escape" && slashMenuOpen) {
      event.preventDefault();
      onDraftChange("");
      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
      return;
    }

    if (
      event.key === "/" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      draft === ""
    ) {
      return;
    }
  }

  const canSend = sendEnabled && draft.trim().length > 0;

  return (
    <footer className="inbox-chat-composer-wrap">
      <div className="inbox-chat-composer">
        <div className="flex items-end gap-2">
          <div className="inbox-composer-field">
            {slashMenuOpen && (
              <ComposerSlashMenu
                commands={filteredCommands}
                activeIndex={slashActiveIndex}
                onActiveIndexChange={setSlashActiveIndex}
                onSelect={selectSlashCommand}
              />
            )}

            <div
              className="inbox-composer-toolbar"
              role="toolbar"
              aria-label="Acciones rápidas de venta"
            >
              {COMPOSER_COMMANDS.map((command) => {
                const Icon = command.icon;

                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => applySnippet(command.snippet)}
                    className="inbox-composer-tool-btn"
                    title={command.label}
                    aria-label={command.label}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              rows={2}
              placeholder="Escribe para cerrar la venta…  / respuestas rápidas"
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
        <p className="inbox-composer-kbd-hint" aria-hidden="true">
          <kbd>{sendShortcutLabel}</kbd> enviar · <kbd>/</kbd> comandos · <kbd>↑↓</kbd> chats
        </p>
      </div>
    </footer>
  );
}
