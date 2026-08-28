"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M21.2 4.3 2.9 11.3c-1.25.5-1.24 1.2-.22 1.52l4.7 1.47 1.82 5.6c.22.67.11.93.75.93.39 0 .56-.18.77-.4l2.2-2.14 4.57 3.37c.84.46 1.45.22 1.66-.78L22.4 5.7c.28-1.33-.5-1.93-1.2-1.4Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M13.5 21v-7.2h2.4l.36-2.8H13.5V9.18c0-.81.22-1.36 1.39-1.36H16.4V5.32c-.24-.03-1.07-.1-2.04-.1-2.02 0-3.4 1.23-3.4 3.5v1.96H8.5v2.8h2.46V21H13.5Z" />
    </svg>
  );
}

interface CatalogProductShareMenuProps {
  productName: string;
  shareUrl: string;
  className?: string;
}

function twitterShareHref(url: string, text: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function facebookShareHref(url: string): string {
  const params = new URLSearchParams({ u: url });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

function whatsappShareHref(url: string, text: string): string {
  const params = new URLSearchParams({ text: `${text}\n${url}` });
  return `https://wa.me/?${params.toString()}`;
}

function telegramShareHref(url: string, text: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://t.me/share/url?${params.toString()}`;
}

export function CatalogProductShareMenu({
  productName,
  shareUrl,
  className,
}: CatalogProductShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canNativeShare = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return typeof navigator.share === "function";
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: productName,
        text: productName,
        url: shareUrl,
      });
      setOpen(false);
    } catch {
      // El usuario canceló o el navegador no completó el share.
    }
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="product-detail-share-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Compartir producto"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Compartir
      </button>

      {open ? (
        <div
          className="product-detail-share-menu"
          role="menu"
          aria-label="Opciones para compartir"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            <span aria-live="polite">
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </span>
          </button>

          <a
            role="menuitem"
            className={itemClass}
            href={whatsappShareHref(shareUrl, productName)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>

          <a
            role="menuitem"
            className={itemClass}
            href={facebookShareHref(shareUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <FacebookIcon className="h-4 w-4" />
            Facebook
          </a>

          <a
            role="menuitem"
            className={itemClass}
            href={twitterShareHref(shareUrl, productName)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-4 w-4 items-center justify-center text-[11px] font-bold" aria-hidden="true">
              𝕏
            </span>
            X
          </a>

          <a
            role="menuitem"
            className={itemClass}
            href={telegramShareHref(shareUrl, productName)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <TelegramIcon className="h-4 w-4 text-sky-500" />
            Telegram
          </a>

          {canNativeShare ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => void handleNativeShare()}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Más opciones
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
