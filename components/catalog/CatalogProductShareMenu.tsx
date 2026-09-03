"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildNativeShareData,
  buildProductShareText,
  buildWhatsAppShareHref,
} from "@/lib/catalog/product-share";

interface CatalogProductShareMenuProps {
  productName: string;
  shareUrl: string;
  priceUsd?: number | null;
  storeName?: string | null;
  className?: string;
  /** Iconos sobre la galería (ficha tipo Mercado Libre). */
  onMedia?: boolean;
}

function resolveShareUrl(shareUrl: string): string {
  if (typeof window === "undefined") return shareUrl;
  const trimmed = shareUrl.trim();
  if (!trimmed) return window.location.href;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

export function CatalogProductShareMenu({
  productName,
  shareUrl,
  priceUsd = null,
  storeName = null,
  className,
  onMedia = false,
}: CatalogProductShareMenuProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);

  const payload = useMemo(
    () => ({
      productName,
      shareUrl: resolveShareUrl(shareUrl),
      priceUsd,
      storeName,
    }),
    [productName, shareUrl, priceUsd, storeName],
  );
  const shareText = useMemo(
    () => buildProductShareText(payload),
    [payload],
  );
  const whatsappHref = useMemo(
    () => buildWhatsAppShareHref(shareText),
    [shareText],
  );

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  async function handleNativeShare() {
    if (canNativeShare) {
      try {
        await navigator.share(buildNativeShareData(payload));
        return;
      } catch {
        // Cancelado: no abrir WhatsApp encima.
        return;
      }
    }
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={cn(
        "product-detail-quick-actions",
        onMedia && "product-detail-quick-actions--on-media",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void handleNativeShare()}
        className="product-detail-icon-btn"
        aria-label="Compartir producto"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className="product-detail-icon-btn-label">Compartir</span>
      </button>
      <a
        className="product-detail-icon-btn product-detail-icon-btn--wa"
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir por WhatsApp"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        <span className="product-detail-icon-btn-label">WhatsApp</span>
      </a>
    </div>
  );
}
