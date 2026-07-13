"use client";

import {
  BookOpen,
  Link2,
  MapPin,
  Send,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    id: "catalog",
    label: "Enviar Catálogo",
    icon: BookOpen,
    snippet:
      "¡Hola! Aquí tienes nuestro catálogo actualizado con todos los productos disponibles. ¿Hay algo que te interese?",
  },
  {
    id: "payment",
    label: "Generar Link Pago",
    icon: Link2,
    snippet:
      "Te comparto el enlace de pago seguro para completar tu pedido. Avísame cuando lo hayas realizado para confirmarte la orden.",
  },
  {
    id: "address",
    label: "Pedir Dirección",
    icon: MapPin,
    snippet:
      "Para coordinar el envío, ¿podrías confirmarme tu dirección completa, ciudad y un teléfono de contacto?",
  },
] as const;

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
}

export function ChatComposer({ draft, onDraftChange }: ChatComposerProps) {
  function applySnippet(snippet: string) {
    onDraftChange(draft.trim() ? `${draft.trim()}\n\n${snippet}` : snippet);
  }

  return (
    <footer className="inbox-chat-composer-wrap">
      <div className="inbox-chat-composer">
        <div className="flex items-end gap-2">
          <div className="inbox-composer-field">
            <div
              className="inbox-composer-toolbar"
              role="toolbar"
              aria-label="Acciones rápidas de venta"
            >
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => applySnippet(action.snippet)}
                    className="inbox-composer-tool-btn"
                    title={action.label}
                    aria-label={action.label}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
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
            className="btn-brand inbox-chat-composer-send"
            title="Respuestas salientes próximamente"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
