"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import {
  buildWhatsAppQuickChatMessage,
  normalizeWhatsAppChatWelcome,
} from "@/lib/catalog/whatsapp-quick-chat";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";

interface CatalogWhatsAppQuickChatProps {
  storeName: string;
  whatsappPhone: string;
  welcomeMessage?: string | null;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 6.045L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Panel de consulta por WhatsApp (sin FAB flotante).
 * Se abre desde la cabecera vía shell navigation.
 */
export function CatalogWhatsAppQuickChat({
  storeName,
  whatsappPhone,
  welcomeMessage = null,
}: CatalogWhatsAppQuickChatProps) {
  const phone = whatsappPhone.trim();
  const shellNav = useCatalogShellNavigationOptional();
  const open = Boolean(shellNav?.whatsAppChatOpen);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const welcome = normalizeWhatsAppChatWelcome(welcomeMessage);

  useEffect(() => {
    if (!shellNav) return;
    shellNav.setWhatsAppAvailable(Boolean(phone));
    return () => {
      shellNav.setWhatsAppAvailable(false);
    };
  }, [shellNav, phone]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!phone || !shellNav || !open) return null;

  function handleSend() {
    const message = buildWhatsAppQuickChatMessage(storeName, draft);
    const url = buildWhatsAppOrderUrl(phone, message);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    shellNav.closeWhatsAppChat();
    setDraft("");
  }

  function handleClose() {
    shellNav.closeWhatsAppChat();
  }

  return (
    <div className="catalog-wa-overlay" role="presentation">
      <button
        type="button"
        className="catalog-wa-backdrop"
        aria-label="Cerrar chat de WhatsApp"
        onClick={handleClose}
      />
      <div
        className="catalog-wa-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="catalog-wa-header">
          <div className="catalog-wa-header-main">
            <span className="catalog-wa-header-icon" aria-hidden="true">
              <WhatsAppGlyph className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="catalog-wa-title">
                {storeName}
              </h2>
              <p className="catalog-wa-status">En línea · WhatsApp</p>
            </div>
          </div>
          <button
            type="button"
            className="catalog-wa-close"
            aria-label="Cerrar"
            onClick={handleClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="catalog-wa-messages">
          <div className="catalog-wa-bubble catalog-wa-bubble-store">
            <p>{welcome}</p>
          </div>
          <p className="catalog-wa-hint">
            Escribe tu consulta y te llevamos a WhatsApp con el mensaje listo
            para enviar.
          </p>
        </div>

        <form
          className="catalog-wa-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.trim()) {
              inputRef.current?.focus();
              return;
            }
            handleSend();
          }}
        >
          <label className="sr-only" htmlFor={`${titleId}-input`}>
            Tu consulta
          </label>
          <textarea
            ref={inputRef}
            id={`${titleId}-input`}
            className="catalog-wa-input"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu mensaje…"
            enterKeyHint="send"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) handleSend();
              }
            }}
          />
          <button
            type="submit"
            className="catalog-wa-send"
            disabled={!draft.trim()}
            aria-label="Enviar por WhatsApp"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
