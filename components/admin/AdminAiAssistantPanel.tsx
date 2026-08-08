"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminAssistantMessage } from "@/lib/ai/admin-assistant-types";
import { AssistantMessageContent } from "@/components/dashboard/assistant/AssistantMessageContent";

interface AdminAiAssistantPanelProps {
  assistantEnabled: boolean;
  /** Variante compacta para el resumen; completa para la pestaña IA. */
  variant?: "compact" | "full";
}

const EXAMPLE_PROMPTS = [
  "¿Qué tiendas se registraron hoy?",
  "¿Cuántos pagos pendientes hay y de quiénes?",
  "¿Hay mensajes de soporte sin atender?",
  "¿Qué cupones y campañas están activos?",
  "Resume planes, precios y límites actuales.",
] as const;

function createMessage(
  role: AdminAssistantMessage["role"],
  content: string,
): AdminAssistantMessage {
  return { role, content };
}

/** Chat del asistente IA gerencial (soporte interno + consulta de datos). */
export function AdminAiAssistantPanel({
  assistantEnabled,
  variant = "full",
}: AdminAiAssistantPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AdminAssistantMessage[]>(() => [
    createMessage(
      "assistant",
      "Hola. Soy el asistente gerencial de Alcéntimo. Consulto en tiempo real tiendas, usuarios, pagos, soporte, cupones y planes para darte la respuesta directa.",
    ),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const response = await fetch("/api/admin/ai-support", {
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
    <section
      className={cn(
        "admin-ai-panel",
        variant === "full" && "admin-ai-panel-full",
      )}
      aria-labelledby="admin-ai-title"
    >
      <div className="admin-ai-panel-header">
        <div className="flex items-center gap-2">
          <span className="admin-ai-panel-icon" aria-hidden="true">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3
              id="admin-ai-title"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Asistente IA gerencial
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Soporte interno y consultas sobre usuarios, tiendas, planes y pagos.
            </p>
          </div>
        </div>
        <span className="admin-ai-panel-badge">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          gpt-4o-mini
        </span>
      </div>

      {!assistantEnabled ? (
        <p className="mt-4 text-sm text-amber-800 dark:text-amber-200" role="status">
          Configura{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            OPENAI_API_KEY
          </code>{" "}
          (clave de OpenRouter) para activar el asistente.
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "admin-ai-messages",
          variant === "compact" ? "admin-ai-messages-compact" : "admin-ai-messages-full",
        )}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "admin-ai-bubble",
              message.role === "user"
                ? "admin-ai-bubble-user"
                : "admin-ai-bubble-assistant",
            )}
          >
            {message.role === "user" ? (
              message.content
            ) : (
              <AssistantMessageContent
                content={message.content}
                variant="assistant"
              />
            )}
          </div>
        ))}
        {loading ? (
          <div className="admin-ai-bubble admin-ai-bubble-assistant admin-ai-typing">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Consultando datos…</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading || !assistantEnabled}
            onClick={() => void sendMessage(prompt)}
            className="admin-ai-quick-prompt"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <textarea
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
          placeholder="Ej. ¿Cuál es el correo de la tienda X?"
          className="admin-ai-panel-input min-h-[2.75rem] flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Consulta para el asistente IA gerencial"
        />
        <button
          type="submit"
          disabled={loading || !assistantEnabled || !input.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-50"
          aria-label="Enviar consulta"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </form>
    </section>
  );
}
