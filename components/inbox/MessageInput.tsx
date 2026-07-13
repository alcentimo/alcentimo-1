"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Send } from "lucide-react";
import type { ChannelMessage } from "@/lib/inbox/types";
import { sendInboxMessage } from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type SendState = "idle" | "sending" | "sent" | "error";

interface MessageInputProps {
  conversationId: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onMessageSent?: (message: ChannelMessage) => void;
  onOptimisticMessage?: (message: ChannelMessage) => void;
  onRemoveOptimisticMessage?: (messageId: string) => void;
}

const MAX_SEND_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildOptimisticMessage(
  conversationId: string,
  body: string,
): ChannelMessage {
  return {
    id: `pending-${conversationId}-${Date.now()}`,
    integration_id: "pending",
    sender_id: "agent",
    message_text: body,
    direction: "outbound",
    status: "read",
    deliveryStatus: "sent",
    created_at: new Date().toISOString(),
  };
}

export function MessageInput({
  conversationId,
  draft,
  onDraftChange,
  onMessageSent,
  onOptimisticMessage,
  onRemoveOptimisticMessage,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedBody, setLastFailedBody] = useState<string | null>(null);
  const [, startSendTransition] = useTransition();

  const trimmedDraft = draft.trim();
  const canPersist = Boolean(
    conversationId && isPersistedConversation(conversationId ?? ""),
  );
  const canSend =
    canPersist && Boolean(trimmedDraft) && sendState !== "sending";

  useEffect(() => {
    if (sendState === "sent") {
      const timeout = window.setTimeout(() => setSendState("idle"), 1800);
      return () => window.clearTimeout(timeout);
    }
  }, [sendState]);

  async function attemptSend(body: string): Promise<{ error?: string; message?: ChannelMessage }> {
    if (!conversationId) {
      return { error: "Selecciona una conversación." };
    }

    let lastError = "No se pudo enviar el mensaje.";

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
      const result = await sendInboxMessage(conversationId, body);
      if (!result.error) {
        return result;
      }

      lastError = result.error;
      if (attempt < MAX_SEND_ATTEMPTS) {
        await sleep(800 * attempt);
      }
    }

    return { error: lastError };
  }

  function handleSend() {
    if (!canSend || !conversationId) return;

    const body = trimmedDraft;
    const optimisticMessage = buildOptimisticMessage(conversationId, body);

    setSendError(null);
    setSendState("sending");
    setLastFailedBody(null);
    onOptimisticMessage?.(optimisticMessage);

    startSendTransition(async () => {
      const result = await attemptSend(body);

      if (result.error || !result.message) {
        onRemoveOptimisticMessage?.(optimisticMessage.id);
        setSendState("error");
        setSendError(result.error ?? "No se pudo enviar el mensaje.");
        setLastFailedBody(body);
        textareaRef.current?.focus();
        return;
      }

      onRemoveOptimisticMessage?.(optimisticMessage.id);
      onMessageSent?.(result.message);
      onDraftChange("");
      setSendState("sent");
      setLastFailedBody(null);
      textareaRef.current?.focus();
    });
  }

  function handleRetryLast() {
    if (!lastFailedBody || sendState === "sending") return;
    onDraftChange(lastFailedBody);
    textareaRef.current?.focus();
  }

  return (
    <div className="inbox-pro-message-input">
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
        rows={3}
        placeholder={
          canPersist
            ? "Escribe tu respuesta…"
            : "Esta conversación aún no está sincronizada en el inbox."
        }
        disabled={!canPersist || sendState === "sending"}
        className="min-h-[88px] resize-none"
      />

      <div className="inbox-pro-message-input-footer">
        <div className="inbox-pro-message-input-status" aria-live="polite">
          {sendState === "sending" && (
            <span className="inbox-pro-message-input-status--sending">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Enviando…
            </span>
          )}
          {sendState === "sent" && (
            <span className="inbox-pro-message-input-status--sent">Enviado</span>
          )}
          {sendState === "error" && sendError && (
            <span className="inbox-pro-message-input-status--error">{sendError}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sendState === "error" && lastFailedBody && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetryLast}
              className="h-8 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          )}

          <Button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            size="sm"
            className="h-9 gap-2 px-4"
            aria-label="Enviar mensaje"
          >
            {sendState === "sending" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
