"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { readFulfillmentPrefs } from "@/lib/catalog/fulfillment-storage";
import type { StorefrontAssistantMessage } from "@/lib/ai/storefront-assistant-types";

interface CatalogChatWidgetProps {
  storeSlug: string;
  storeName: string;
}

const QUICK_PROMPTS = [
  "¿Qué métodos de entrega tienen?",
  "¿Cuál es la dirección de retiro?",
  "¿Tienen este producto disponible?",
];

function createMessage(
  role: StorefrontAssistantMessage["role"],
  content: string,
): StorefrontAssistantMessage {
  return { role, content };
}

export function CatalogChatWidget({
  storeSlug,
  storeName,
}: CatalogChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StorefrontAssistantMessage[]>(() => [
    createMessage(
      "assistant",
      `¡Hola! Soy el asistente de ${storeName}. Puedo ayudarte con productos, stock, sucursales y formas de entrega.`,
    ),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      const nextMessages = [...messages, createMessage("user", trimmed)];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        const locationId =
          readFulfillmentPrefs(storeSlug).selectedLocationId ?? null;

        const response = await fetch(`/api/catalog/${storeSlug}/assistant`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.slice(1),
            locationId,
          }),
        });

        const payload = (await response.json()) as {
          reply?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo obtener respuesta.");
        }

        if (!payload.reply?.trim()) {
          throw new Error("Respuesta vacía del asistente.");
        }

        setMessages((current) => [
          ...current,
          createMessage("assistant", payload.reply!.trim()),
        ]);
      } catch (sendError) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Error al enviar el mensaje.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, storeSlug],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("catalog-chat-fab", open && "catalog-chat-fab-hidden")}
        aria-label="Abrir asistente virtual"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="catalog-chat-overlay" role="dialog" aria-label="Asistente virtual">
          <button
            type="button"
            className="txn-cart-backdrop"
            aria-label="Cerrar asistente"
            onClick={() => setOpen(false)}
          />
          <div className="catalog-chat-panel">
            <header className="catalog-chat-header">
              <div>
                <h2 className="catalog-chat-title">Asistente</h2>
                <p className="catalog-chat-subtitle">{storeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="txn-icon-btn"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div ref={scrollRef} className="catalog-chat-messages">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "catalog-chat-bubble",
                    message.role === "user"
                      ? "catalog-chat-bubble-user"
                      : "catalog-chat-bubble-assistant",
                  )}
                >
                  {message.content}
                </div>
              ))}
              {loading ? (
                <div className="catalog-chat-bubble catalog-chat-bubble-assistant catalog-chat-typing">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Escribiendo…</span>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="catalog-chat-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="catalog-chat-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt)}
                  className="catalog-chat-quick-prompt"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="catalog-chat-input-row">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={1}
                maxLength={500}
                disabled={loading}
                placeholder="Escribe tu pregunta…"
                className="catalog-chat-input"
                aria-label="Mensaje para el asistente"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="catalog-chat-send-btn"
                aria-label="Enviar mensaje"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
