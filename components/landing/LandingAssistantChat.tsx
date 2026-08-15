"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LandingAssistantMessage } from "@/lib/ai/landing-assistant-types";

const QUICK_PROMPTS = [
  "¿Qué es Alcentimo?",
  "¿Cómo ayuda la IA?",
  "¿Puedo usar mi propio dominio?",
  "¿Cómo empiezo gratis?",
];

const WELCOME_MESSAGE =
  "¡Hola! Soy el asistente de Alcentimo. Te ayudo a entender cómo crear tu tienda, elegir productos listos para vender y empezar tu negocio de dropshipping sin inventario. ¿En qué te ayudo?";

function createMessage(
  role: LandingAssistantMessage["role"],
  content: string,
): LandingAssistantMessage {
  return { role, content };
}

export function LandingAssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LandingAssistantMessage[]>(() => [
    createMessage("assistant", WELCOME_MESSAGE),
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
        const response = await fetch("/api/landing/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.slice(1),
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
    [loading, messages],
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
        className={cn("landing-assistant-fab", open && "landing-assistant-fab-hidden")}
        aria-label="Abrir asistente de Alcentimo"
      >
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="landing-assistant-overlay"
          role="dialog"
          aria-label="Asistente de Alcentimo"
        >
          <button
            type="button"
            className="landing-assistant-backdrop"
            aria-label="Cerrar asistente"
            onClick={() => setOpen(false)}
          />
          <div className="landing-assistant-panel">
            <header className="landing-assistant-header">
              <div className="landing-assistant-header-main">
                <span className="landing-assistant-icon" aria-hidden="true">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="landing-assistant-title">Asistente Alcentimo</h2>
                  <span className="landing-assistant-badge">Asistencia inteligente</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="landing-assistant-close"
                aria-label="Cerrar chat"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div ref={scrollRef} className="landing-assistant-messages">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "landing-assistant-bubble-row",
                    message.role === "user" && "landing-assistant-bubble-row-user",
                  )}
                >
                  <div
                    className={cn(
                      "landing-assistant-bubble",
                      message.role === "user"
                        ? "landing-assistant-bubble-user"
                        : "landing-assistant-bubble-assistant",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="landing-assistant-bubble-row">
                  <div className="landing-assistant-bubble landing-assistant-bubble-assistant landing-assistant-typing">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Escribiendo…</span>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="landing-assistant-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="landing-assistant-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt)}
                  className="landing-assistant-quick-prompt"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="landing-assistant-input-row">
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
                placeholder="Pregunta sobre planes, dropshipping o cómo empezar…"
                className="landing-assistant-input"
                aria-label="Mensaje para el asistente de Alcentimo"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="landing-assistant-send-btn"
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
