"use client";

import { useEffect, useState, useTransition } from "react";
import { updateInboxContactPrivateNotes } from "@/lib/inbox/actions";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";

interface ContactQuickNotesProps {
  contactId: string | null;
  conversationId: string;
  initialNotes: string;
  onNotesChange: (notes: string) => void;
}

export function ContactQuickNotes({
  contactId,
  conversationId,
  initialNotes,
  onNotesChange,
}: ContactQuickNotesProps) {
  const [draft, setDraft] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setDraft(initialNotes);
    setSavedNotes(initialNotes);
    setErrorMessage(null);
  }, [conversationId, contactId, initialNotes]);

  const isDirty = draft !== savedNotes;

  function saveNotes() {
    if (!contactId || !isDirty || isSaving) return;

    startSaveTransition(async () => {
      const result = await updateInboxContactPrivateNotes(contactId, draft);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      setSavedNotes(draft);
      onNotesChange(draft);
      setErrorMessage(null);
    });
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    onNotesChange(value);
  }

  return (
    <ContextModuleCard title="Notas rápidas">
      <p className="inbox-context-module-hint">
        Solo visible para tu equipo. El cliente no las ve.
      </p>

      <textarea
        value={draft}
        onChange={(event) => handleDraftChange(event.target.value)}
        onBlur={saveNotes}
        rows={4}
        placeholder="Ej. prefiere entrega por la tarde, cliente VIP…"
        disabled={!contactId || isSaving}
        className="inbox-context-notes-input"
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="inbox-context-notes-status" aria-live="polite">
          {!contactId
            ? "Sincroniza el chat para guardar notas."
            : isSaving
              ? "Guardando…"
              : isDirty
                ? "Cambios sin guardar"
                : savedNotes
                  ? "Nota guardada"
                  : "Sin notas"}
        </span>

        <button
          type="button"
          onClick={saveNotes}
          disabled={!contactId || !isDirty || isSaving}
          className="inbox-context-notes-save"
        >
          Guardar
        </button>
      </div>

      {errorMessage && (
        <p className="inbox-context-notes-error" role="alert">
          {errorMessage}
        </p>
      )}
    </ContextModuleCard>
  );
}
