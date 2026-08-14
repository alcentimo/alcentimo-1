"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Lock, Send } from "lucide-react";
import {
  getOrCreateMercadoConversation,
  listMercadoMessages,
  sendMercadoMessage,
  type MercadoMessage,
} from "@/lib/mercado-oculto/chat-actions";
import { cn } from "@/lib/cn";

type ChatAccessMode = "anonymous" | "no_subscription" | "subscriber";

interface MercadoChatPanelProps {
  productId: string;
  currentUserId: string | null;
  isOwnProduct: boolean;
  accessMode: ChatAccessMode;
  /** Conversación concreta (p. ej. vendedor respondiendo desde Chats). */
  initialConversationId?: string | null;
}

export function MercadoChatPanel({
  productId,
  currentUserId,
  isOwnProduct,
  accessMode,
  initialConversationId = null,
}: MercadoChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<MercadoMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(accessMode === "subscriber");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loginNext = encodeURIComponent(
    `/mercado-oculto/producto/${productId}${
      initialConversationId ? `?c=${initialConversationId}` : ""
    }`,
  );

  useEffect(() => {
    if (accessMode !== "subscriber") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function boot() {
      setLoading(true);
      setError(null);

      if (initialConversationId) {
        setConversationId(initialConversationId);
        const msgResult = await listMercadoMessages(initialConversationId);
        if (cancelled) return;
        setLoading(false);
        if (msgResult.error) {
          setError(msgResult.error);
          return;
        }
        setMessages(msgResult.messages ?? []);
        return;
      }

      if (isOwnProduct) {
        setLoading(false);
        setConversationId(null);
        setMessages([]);
        return;
      }

      const result = await getOrCreateMercadoConversation(productId);
      if (cancelled) return;
      if (result.error || !result.conversationId) {
        setError(result.error ?? "No se pudo abrir el chat.");
        setLoading(false);
        return;
      }
      setConversationId(result.conversationId);
      const msgResult = await listMercadoMessages(result.conversationId);
      if (cancelled) return;
      setLoading(false);
      if (msgResult.error) {
        setError(msgResult.error);
        return;
      }
      setMessages(msgResult.messages ?? []);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [productId, isOwnProduct, initialConversationId, accessMode]);

  useEffect(() => {
    if (accessMode !== "subscriber" || !conversationId) return;

    const timer = window.setInterval(() => {
      void listMercadoMessages(conversationId).then((result) => {
        if (!result.error && result.messages) {
          setMessages(result.messages);
        }
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [conversationId, accessMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (accessMode === "anonymous") {
    return (
      <div className="mercado-chat-panel">
        <div className="mercado-chat-header">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Chat de negociación
          </p>
          <p className="text-xs text-zinc-500">
            Inicia sesión para conversar con el dueño de la tienda.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-start justify-center gap-3 px-4 py-8">
          <p className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <Lock className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            La vitrina es pública; el chat requiere cuenta.
          </p>
          <Link
            href={`/dashboard/login?next=${loginNext}`}
            className="btn-brand !min-h-10 !text-sm"
          >
            Iniciar sesión para chatear
          </Link>
        </div>
      </div>
    );
  }

  if (accessMode === "no_subscription") {
    return (
      <div className="mercado-chat-panel">
        <div className="mercado-chat-header">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Chat de negociación
          </p>
          <p className="text-xs text-zinc-500">
            Necesitas una suscripción activa de Alcéntimo para negociar.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-start justify-center gap-3 px-4 py-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Ya iniciaste sesión, pero el chat interno es solo para suscriptores.
          </p>
          <Link
            href="/dashboard/planes?mercado_denied=1"
            className="btn-brand !min-h-10 !text-sm"
          >
            Ver planes
          </Link>
        </div>
      </div>
    );
  }

  if (isOwnProduct && !conversationId && !loading) {
    return (
      <div className="mercado-chat-panel">
        <p className="p-4 text-sm text-zinc-600 dark:text-zinc-300">
          Este es un producto de tu tienda. Abre un chat desde{" "}
          <Link
            href="/mercado-oculto/conversaciones"
            className="font-medium underline"
          >
            Chats
          </Link>{" "}
          para responder a interesados.
        </p>
      </div>
    );
  }

  function handleSend() {
    if (!conversationId || !draft.trim()) return;
    setError(null);
    const body = draft.trim();
    setDraft("");
    startTransition(async () => {
      const result = await sendMercadoMessage({ conversationId, body });
      if (result.error || !result.message) {
        setError(result.error ?? "No se pudo enviar.");
        setDraft(body);
        return;
      }
      setMessages((current) => [...current, result.message!]);
    });
  }

  return (
    <div className="mercado-chat-panel">
      <div className="mercado-chat-header">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Chat de negociación
        </p>
        <p className="text-xs text-zinc-500">
          Sin carrito ni pagos en Alcéntimo. Coordina precio y envío fuera de la
          plataforma.
        </p>
      </div>

      <div className="mercado-chat-thread" aria-live="polite">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abriendo chat…
          </p>
        ) : null}
        {!loading && messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Sé el primero en escribir. Presenta tu interés y pregunta por
            disponibilidad.
          </p>
        ) : null}
        {messages.map((message) => {
          const mine = Boolean(
            currentUserId && message.senderUserId === currentUserId,
          );
          return (
            <div
              key={message.id}
              className={cn(
                "mercado-chat-bubble",
                mine ? "mercado-chat-bubble-mine" : "mercado-chat-bubble-theirs",
              )}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.body}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="px-3 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="mercado-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <label className="sr-only" htmlFor="mercado-chat-input">
          Mensaje
        </label>
        <input
          id="mercado-chat-input"
          className="input-field !min-h-10"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe tu mensaje…"
          disabled={pending || loading || !conversationId}
          maxLength={4000}
        />
        <button
          type="submit"
          className="btn-brand !min-h-10 !px-3"
          disabled={pending || loading || !draft.trim() || !conversationId}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Enviar</span>
        </button>
      </form>
    </div>
  );
}
