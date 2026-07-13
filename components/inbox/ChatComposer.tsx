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
    tone: "catalog",
    snippet:
      "¡Hola! Aquí tienes nuestro catálogo actualizado con todos los productos disponibles. ¿Hay algo que te interese?",
  },
  {
    id: "payment",
    label: "Generar Link Pago",
    icon: Link2,
    tone: "payment",
    snippet:
      "Te comparto el enlace de pago seguro para completar tu pedido. Avísame cuando lo hayas realizado para confirmarte la orden.",
  },
  {
    id: "address",
    label: "Pedir Dirección",
    icon: MapPin,
    tone: "address",
    snippet:
      "Para coordinar el envío, ¿podrías confirmarme tu dirección completa, ciudad y un teléfono de contacto?",
  },
] as const;

interface ChatComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  focusMode?: boolean;
}

export function ChatComposer({
  draft,
  onDraftChange,
  focusMode = false,
}: ChatComposerProps) {
  function applySnippet(snippet: string) {
    onDraftChange(draft.trim() ? `${draft.trim()}\n\n${snippet}` : snippet);
  }

  return (
    <footer className="inbox-chat-composer-wrap">
      <div className="inbox-chat-composer">
        <div
          className="inbox-quick-actions-bar"
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
                className={`inbox-quick-action-chip inbox-quick-action-chip--${action.tone}`}
                title={action.label}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{action.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-end gap-2 sm:gap-3">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={2}
            placeholder="Escribe una respuesta de venta…"
            className="inbox-chat-composer-input"
          />
          <button
            type="button"
            disabled
            className="btn-brand inbox-chat-composer-send"
            title="Respuestas salientes próximamente"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>

        {!focusMode && (
          <p className="inbox-chat-composer-hint">
            Acciones rápidas para acelerar el cierre de ventas.
          </p>
        )}
      </div>
    </footer>
  );
}
