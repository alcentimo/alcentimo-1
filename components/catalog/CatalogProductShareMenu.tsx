"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Facebook, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

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
            {copied ? "Enlace copiado" : "Copiar enlace"}
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
            <Facebook className="h-4 w-4" aria-hidden="true" />
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
            <Share2 className="h-4 w-4" aria-hidden="true" />
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
