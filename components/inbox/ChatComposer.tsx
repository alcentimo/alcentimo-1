"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Link2,
  MessageSquareText,
  Send,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";
import type { ChannelMessage } from "@/lib/inbox/types";
import { appendInboxConversationActivity, sendInboxMessage } from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { ComposerCatalogModal } from "@/components/inbox/ComposerCatalogModal";
import { ComposerPaymentMenu } from "@/components/inbox/ComposerPaymentMenu";
import { ComposerTemplatesMenu } from "@/components/inbox/ComposerTemplatesMenu";

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  products: CatalogListItem[];
  storeSlug: string;
  conversationId: string | null;
  onActivityLogged?: (event: ClientActivityEvent) => void;
  onMessageSent?: (message: ChannelMessage) => void;
}

export function ChatComposer({
  draft,
  onDraftChange,
  products,
  storeSlug,
  conversationId,
  onActivityLogged,
  onMessageSent,
}: ChatComposerProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, startSendTransition] = useTransition();

  function applySnippet(snippet: string) {
    onDraftChange(draft.trim() ? `${draft.trim()}\n\n${snippet}` : snippet);
  }

  function logActivity(label: string, type = "event") {
    const event: ClientActivityEvent = {
      id: `local-${Date.now()}`,
      label,
      createdAt: new Date().toISOString(),
    };

    onActivityLogged?.(event);

    if (!conversationId || !isPersistedConversation(conversationId)) return;

    void appendInboxConversationActivity(conversationId, label, type);
  }

  function applySnippetWithActivity(
    snippet: string,
    activityLabel: string,
    activityType = "event",
  ) {
    applySnippet(snippet);
    logActivity(activityLabel, activityType);
  }

  function closeMenus() {
    setPaymentOpen(false);
    setTemplatesOpen(false);
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !conversationId || isSending) return;

    setSendError(null);
    startSendTransition(async () => {
      const result = await sendInboxMessage(conversationId, trimmed);
      if (result.error) {
        setSendError(result.error);
        return;
      }

      if (result.message) {
        onMessageSent?.(result.message);
      }

      onDraftChange("");
      logActivity("Mensaje enviado", "message");
    });
  }

  const canSend =
    Boolean(conversationId) &&
    Boolean(draft.trim()) &&
    !isSending &&
    isPersistedConversation(conversationId ?? "");

  return (
    <>
      <footer className="inbox-chat-composer-wrap">
        <div className="inbox-chat-composer">
          <div className="inbox-composer-field">
            <div
              className="inbox-composer-toolbar"
              role="toolbar"
              aria-label="Acciones de venta"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    closeMenus();
                    setCatalogOpen(true);
                  }}
                  className={`inbox-composer-tool-btn ${catalogOpen ? "inbox-composer-tool-btn--active" : ""}`}
                  title="Catálogo"
                  aria-label="Abrir catálogo de productos"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTemplatesOpen(false);
                    setPaymentOpen((current) => !current);
                  }}
                  className={`inbox-composer-tool-btn ${paymentOpen ? "inbox-composer-tool-btn--active" : ""}`}
                  title="Link de pago"
                  aria-label="Opciones de link de pago"
                  aria-expanded={paymentOpen}
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
                <ComposerPaymentMenu
                  open={paymentOpen}
                  storeSlug={storeSlug}
                  onClose={() => setPaymentOpen(false)}
                  onSelectSnippet={(snippet, activityLabel) =>
                    applySnippetWithActivity(snippet, activityLabel, "payment")
                  }
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentOpen(false);
                    setTemplatesOpen((current) => !current);
                  }}
                  className={`inbox-composer-tool-btn ${templatesOpen ? "inbox-composer-tool-btn--active" : ""}`}
                  title="Plantillas"
                  aria-label="Plantillas de respuesta rápida"
                  aria-expanded={templatesOpen}
                >
                  <MessageSquareText
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                </button>
                <ComposerTemplatesMenu
                  open={templatesOpen}
                  onClose={() => setTemplatesOpen(false)}
                  onSelectTemplate={(text) =>
                    applySnippetWithActivity(text, "Plantilla insertada", "template")
                  }
                />
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder="Escribe para cerrar la venta…"
              className="inbox-chat-composer-input"
            />
          </div>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="inbox-chat-composer-send"
            title={canSend ? "Enviar mensaje" : "Escribe un mensaje para enviar"}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {sendError && (
          <p className="inbox-chat-composer-error">{sendError}</p>
        )}
      </footer>

      <ComposerCatalogModal
        open={catalogOpen}
        products={products}
        onClose={() => setCatalogOpen(false)}
        onSelectProduct={(snippet) =>
          applySnippetWithActivity(snippet, "Producto compartido", "catalog")
        }
      />
    </>
  );
}
