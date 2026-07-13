"use client";

import { useEffect, useState, useTransition } from "react";
import { updateInboxContactTags } from "@/lib/inbox/actions";
import { getContactTagTone } from "@/lib/inbox/contact-tag-colors";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";

interface ContactTagsEditorProps {
  contactId: string | null;
  conversationId: string;
  initialTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function ContactTagsEditor({
  contactId,
  conversationId,
  initialTags,
  onTagsChange,
}: ContactTagsEditorProps) {
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setTags(initialTags);
    setTagInput("");
    setErrorMessage(null);
  }, [conversationId, contactId, initialTags.join("|")]);

  function persistTags(nextTags: string[]) {
    setTags(nextTags);
    onTagsChange(nextTags);

    if (!contactId) return;

    startSaveTransition(async () => {
      const result = await updateInboxContactTags(contactId, nextTags);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      setErrorMessage(null);
    });
  }

  function handleAddTag() {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) return;

    persistTags([...tags, nextTag]);
    setTagInput("");
  }

  function handleRemoveTag(tagToRemove: string) {
    persistTags(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <ContextModuleCard title="Etiquetas">
      <p className="inbox-context-module-hint">
        Clasifica contactos con etiquetas internas del equipo.
      </p>

      <div className="inbox-context-module-list">
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? (
            <p className="inbox-context-module-empty">Sin etiquetas.</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={!contactId || isSaving}
                className={`inbox-contact-tag ${getContactTagTone(tag)} inbox-contact-tag--removable`}
                title="Quitar etiqueta"
              >
                <span>{tag}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-1.5 pt-1">
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Nueva etiqueta"
            disabled={!contactId || isSaving}
            className="inbox-context-input inbox-context-input--compact min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!contactId || isSaving || !tagInput.trim()}
            className="inbox-context-tag-add"
          >
            +
          </button>
        </div>

        {isSaving && (
          <p className="inbox-context-module-hint">Guardando etiquetas…</p>
        )}
        {errorMessage && (
          <p className="inbox-context-notes-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </ContextModuleCard>
  );
}
