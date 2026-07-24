"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OwnerAssistantMessage } from "@/lib/ai/owner-assistant-types";

interface OwnerAssistantChatProps {
  storeName: string;
  assistantEnabled: boolean;
}

const QUICK_PROMPTS = [
  "¿Qué productos tienen stock bajo?",
  "¿Cuánto vendimos hoy?",
  "¿Cuántas órdenes pendientes hay?",
  "¿Cuál es la tasa BCV actual?",
];

function createMessage(
  role: OwnerAssistantMessage["role"],
  content: string,
): OwnerAssistantMessage {
  return { role, content };
}

export function OwnerAssistantChat({
  storeName,
  assistantEnabled,
}: OwnerAssistantChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<OwnerAssistantMessage[]>(() => [
    createMessage(
      "assistant",
      `Hola. Soy tu asistente de inventario y ventas para ${storeName}. Pregúntame sobre stock, pedidos, ventas del día o la tasa BCV.`,
    ),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !assistantEnabled) return;

      setError(null);
      const nextMessages = [...messages, createMessage("user", trimmed)];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch("/api/dashboard/assistant", {
          method: "POST",
          credentials: "same-origin",
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
    [assistantEnabled, loading, messages],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="owner-assistant-shell">
      <div className="owner-assistant-header">
        <div className="owner-assistant-header-icon">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="owner-assistant-title">Asistente IA</h2>
          <p className="owner-assistant-subtitle">
            Consultas en tiempo real sobre {storeName}
          </p>
        </div>
        <div className="owner-assistant-badge">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          gpt-4o-mini
        </div>
      </div>

      {!assistantEnabled ? (
        <p className="owner-assistant-disabled" role="status">
          El asistente no está disponible. Configura{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            OPENAI_API_KEY
          </code>{" "}
          (OpenRouter) en las variables de entorno.
        </p>
      ) : null}

      <div ref={scrollRef} className="owner-assistant-messages">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "owner-assistant-bubble",
              message.role === "user"
                ? "owner-assistant-bubble-user"
                : "owner-assistant-bubble-assistant",
            )}
          >
            {message.content}
          </div>
        ))}
        {loading ? (
          <div className="owner-assistant-bubble owner-assistant-bubble-assistant owner-assistant-typing">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Analizando datos…</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="owner-assistant-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="owner-assistant-quick-prompts">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading || !assistantEnabled}
            onClick={() => void sendMessage(prompt)}
            className="owner-assistant-quick-prompt"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="owner-assistant-input-row">
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
          rows={2}
          maxLength={800}
          disabled={loading || !assistantEnabled}
          placeholder="Pregunta sobre inventario, ventas u operaciones…"
          className="owner-assistant-input"
          aria-label="Mensaje para el asistente"
        />
        <button
          type="submit"
          disabled={loading || !assistantEnabled || !input.trim()}
          className="owner-assistant-send-btn"
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
  );
}
