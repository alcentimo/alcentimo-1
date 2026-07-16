"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Link2,
  MessageSquareText,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";
import type { ChannelMessage } from "@/lib/inbox/types";
import { appendInboxConversationActivity } from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { ComposerCatalogModal } from "@/components/inbox/ComposerCatalogModal";
import { ComposerPaymentMenu } from "@/components/inbox/ComposerPaymentMenu";
import { ComposerTemplatesMenu } from "@/components/inbox/ComposerTemplatesMenu";
import { MessageInput } from "@/components/inbox/MessageInput";

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  products: CatalogListItem[];
  storeSlug: string;
  conversationId: string | null;
  onActivityLogged?: (event: ClientActivityEvent) => void;
  onMessageSent?: (message: ChannelMessage) => void;
  onOptimisticMessage?: (message: ChannelMessage) => void;
  onRemoveOptimisticMessage?: (messageId: string) => void;
}

export function ChatComposer({
  draft,
  onDraftChange,
  products,
  storeSlug,
  conversationId,
  onActivityLogged,
  onMessageSent,
  onOptimisticMessage,
  onRemoveOptimisticMessage,
}: ChatComposerProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [, startActivityTransition] = useTransition();

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

    startActivityTransition(async () => {
      await appendInboxConversationActivity(conversationId, label, type);
    });
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

  function handleMessageSent(message: ChannelMessage) {
    onMessageSent?.(message);
    logActivity("Mensaje enviado", "message");
  }

  return (
    <>
      <footer className="inbox-pro-composer">
        <div className="inbox-pro-composer-toolbar" role="toolbar" aria-label="Acciones de venta">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                closeMenus();
                setCatalogOpen(true);
              }}
              className={`inbox-pro-composer-tool ${catalogOpen ? "inbox-pro-composer-tool--active" : ""}`}
              title="Catálogo"
              aria-label="Abrir catálogo de productos"
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Catálogo</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTemplatesOpen(false);
                setPaymentOpen((current) => !current);
              }}
              className={`inbox-pro-composer-tool ${paymentOpen ? "inbox-pro-composer-tool--active" : ""}`}
              title="Link de pago"
              aria-label="Opciones de link de pago"
              aria-expanded={paymentOpen}
            >
              <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pago</span>
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
              className={`inbox-pro-composer-tool ${templatesOpen ? "inbox-pro-composer-tool--active" : ""}`}
              title="Plantillas"
              aria-label="Plantillas de respuesta rápida"
              aria-expanded={templatesOpen}
            >
              <MessageSquareText
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>Plantillas</span>
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

        <MessageInput
          conversationId={conversationId}
          draft={draft}
          onDraftChange={onDraftChange}
          onMessageSent={handleMessageSent}
          onOptimisticMessage={onOptimisticMessage}
          onRemoveOptimisticMessage={onRemoveOptimisticMessage}
        />
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
