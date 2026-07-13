"use client";

import { useState } from "react";
import {
  BookOpen,
  Link2,
  MessageSquareText,
  Send,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { ComposerCatalogModal } from "@/components/inbox/ComposerCatalogModal";
import { ComposerPaymentMenu } from "@/components/inbox/ComposerPaymentMenu";
import { ComposerTemplatesMenu } from "@/components/inbox/ComposerTemplatesMenu";

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  products: CatalogListItem[];
  storeSlug: string;
}

export function ChatComposer({
  draft,
  onDraftChange,
  products,
  storeSlug,
}: ChatComposerProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  function applySnippet(snippet: string) {
    onDraftChange(draft.trim() ? `${draft.trim()}\n\n${snippet}` : snippet);
  }

  function closeMenus() {
    setPaymentOpen(false);
    setTemplatesOpen(false);
  }

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
                  onSelectSnippet={applySnippet}
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
                  onSelectTemplate={applySnippet}
                />
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              rows={2}
              placeholder="Escribe para cerrar la venta…"
              className="inbox-chat-composer-input"
            />
          </div>
          <button
            type="button"
            disabled
            className="inbox-chat-composer-send"
            title="Respuestas salientes próximamente"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </footer>

      <ComposerCatalogModal
        open={catalogOpen}
        products={products}
        onClose={() => setCatalogOpen(false)}
        onSelectProduct={applySnippet}
      />
    </>
  );
}
