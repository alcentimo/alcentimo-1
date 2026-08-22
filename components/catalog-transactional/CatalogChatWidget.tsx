"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { CatalogChatAvatar } from "@/components/catalog-transactional/CatalogChatAvatar";
import { useCatalogShellNavigation } from "@/components/catalog-transactional/CatalogShellNavigation";
import { cn } from "@/lib/cn";
import { readFulfillmentPrefs } from "@/lib/catalog/fulfillment-storage";
import { buildStorefrontSupportWhatsAppMessage } from "@/lib/catalog/storefront-support-whatsapp";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import type { StorefrontAssistantMessage } from "@/lib/ai/storefront-assistant-types";

interface CatalogChatWidgetProps {
  storeSlug: string;
  storeName: string;
  avatarUrl?: string | null;
  avatarAnimation?: import("@/lib/store-settings/assistant-avatar-presets").AssistantAvatarAnimationKind | null;
  avatarAnimated?: boolean;
  merchantName?: string | null;
  whatsappPhone?: string | null;
  /** Respuestas locales sin API (sandbox de landing). */
  demoMode?: boolean;
}

const QUICK_PROMPTS = [
  "¿Qué productos hay disponibles ahora?",
  "¿Cuál es el precio de este producto?",
  "¿Tienen stock real de Alcentimo?",
];

function createMessage(
  role: StorefrontAssistantMessage["role"],
  content: string,
): StorefrontAssistantMessage {
  return { role, content };
}

function buildWelcomeMessage(storeName: string): string {
  const name = storeName.trim() || "la tienda";
  return `¡Hola! Bienvenido a ${name}. Puedo decirte el stock real y el precio de los productos Alcentimo, y ayudarte a comprar más rápido. Si prefieres una persona, usa WhatsApp abajo.`;
}

function isPlatformBrandName(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalized === "al centimo" ||
    normalized === "alcentimo" ||
    normalized.includes("al centimo") ||
    normalized.includes("alcentimo")
  );
}

export function CatalogChatWidget({
  storeSlug,
  storeName,
  avatarUrl = null,
  avatarAnimation = null,
  avatarAnimated = false,
  merchantName = null,
  whatsappPhone = null,
  demoMode = false,
}: CatalogChatWidgetProps) {
  const shellNav = useCatalogShellNavigation();
  const open = shellNav.assistantOpen;
  const closeAssistant = shellNav.closeAssistant;
  const setAssistantAvailable = shellNav.setAssistantAvailable;

  const supportTitle = useMemo(
    () => `Soporte — ${storeName}`,
    [storeName],
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StorefrontAssistantMessage[]>(() => [
    createMessage("assistant", buildWelcomeMessage(storeName)),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHumanSupport, setShowHumanSupport] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUserQuestionRef = useRef<string | null>(null);

  const whatsappReady = Boolean(whatsappPhone?.trim());
  const avatarLabel =
    merchantName && !isPlatformBrandName(merchantName)
      ? merchantName
      : storeName;
  const showMerchantSubtitle =
    Boolean(merchantName) &&
    !isPlatformBrandName(merchantName) &&
    merchantName!.trim().toLowerCase() !== storeName.trim().toLowerCase();

  useEffect(() => {
    setMessages([
      createMessage("assistant", buildWelcomeMessage(storeName)),
    ]);
  }, [storeName]);

  useEffect(() => {
    setAssistantAvailable(true);
    return () => {
      setAssistantAvailable(false);
    };
  }, [setAssistantAvailable]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading, showHumanSupport]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const openWhatsAppSupport = useCallback(
    (question?: string | null) => {
      const phone = whatsappPhone?.trim();
      if (!phone) return;
      const message = buildStorefrontSupportWhatsAppMessage(
        storeName,
        question ?? lastUserQuestionRef.current,
      );
      const url = buildWhatsAppOrderUrl(phone, message);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [storeName, whatsappPhone],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      lastUserQuestionRef.current = trimmed;
      setError(null);
      setShowHumanSupport(false);
      const nextMessages = [...messages, createMessage("user", trimmed)];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        if (demoMode) {
          await new Promise((resolve) => window.setTimeout(resolve, 650));
          const demoReply = `En ${storeName} puedes consultar el inventario real de productos Alcentimo (stock y precio). Elige lo que esté disponible, agrégalo al carrito y confirma el pedido.`;
          setMessages((current) => [
            ...current,
            createMessage("assistant", demoReply),
          ]);
          setShowHumanSupport(whatsappReady);
          return;
        }

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
          suggestHumanSupport?: boolean;
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
        setShowHumanSupport(Boolean(payload.suggestHumanSupport && whatsappReady));
      } catch (sendError) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Error al enviar el mensaje.",
        );
        setShowHumanSupport(whatsappReady);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, storeSlug, storeName, whatsappReady, demoMode],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  if (!open) return null;

  return (
    <div
      className="catalog-chat-overlay"
      role="dialog"
      aria-label={supportTitle}
    >
      <button
        type="button"
        className="txn-cart-backdrop"
        aria-label="Cerrar asistente"
        onClick={closeAssistant}
      />
      <div className="catalog-chat-panel">
        <header className="catalog-chat-header">
          <div className="catalog-chat-header-main">
            <CatalogChatAvatar
              imageUrl={avatarUrl}
              label={avatarLabel}
              size="md"
              animation={avatarAnimation}
              animated={avatarAnimated}
            />
            <div className="min-w-0">
              <h2 className="catalog-chat-title">{supportTitle}</h2>
              <div className="catalog-chat-subtitle-row">
                {showMerchantSubtitle ? (
                  <p className="catalog-chat-subtitle">{merchantName}</p>
                ) : null}
                <span className="catalog-chat-ai-badge">
                  Asistencia inteligente
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAssistant}
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
                "catalog-chat-bubble-row",
                message.role === "user" && "catalog-chat-bubble-row-user",
              )}
            >
              {message.role === "assistant" ? (
                <CatalogChatAvatar
                  imageUrl={avatarUrl}
                  label={avatarLabel}
                  size="sm"
                  animation={avatarAnimation}
                  animated={avatarAnimated}
                  className="catalog-chat-bubble-avatar"
                />
              ) : null}
              <div
                className={cn(
                  "catalog-chat-bubble",
                  message.role === "user"
                    ? "catalog-chat-bubble-user"
                    : "catalog-chat-bubble-assistant",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="catalog-chat-bubble-row">
              <CatalogChatAvatar
                imageUrl={avatarUrl}
                label={avatarLabel}
                size="sm"
                animation={avatarAnimation}
                animated={avatarAnimated}
                className="catalog-chat-bubble-avatar"
              />
              <div className="catalog-chat-bubble catalog-chat-bubble-assistant catalog-chat-typing">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Consultando catálogo…</span>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="catalog-chat-error" role="alert">
            {error}
          </p>
        ) : null}

        {showHumanSupport && whatsappReady ? (
          <div className="catalog-chat-human-banner">
            <p>¿Quieres que te atienda una persona? Escríbenos por WhatsApp.</p>
            <button
              type="button"
              className="catalog-chat-human-btn"
              onClick={() => openWhatsAppSupport()}
            >
              Hablar con un operador
            </button>
          </div>
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
            placeholder="Pregunta por stock, precio o disponibilidad…"
            className="catalog-chat-input"
            aria-label={`Mensaje para ${supportTitle}`}
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

        {whatsappReady ? (
          <div className="catalog-chat-footer">
            <button
              type="button"
              className="catalog-chat-whatsapp-btn"
              onClick={() => openWhatsAppSupport()}
            >
              Hablar con un humano por WhatsApp
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
