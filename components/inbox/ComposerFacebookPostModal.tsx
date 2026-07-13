"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { buildProductPostDraft } from "@/lib/facebook/post-draft";
import { formatUsd } from "@/lib/format";

interface ComposerFacebookPostModalProps {
  open: boolean;
  product: CatalogListItem | null;
  onClose: () => void;
  onPublished: (productId: string, permalinkUrl: string, publishedAt: string) => void;
}

export function ComposerFacebookPostModal({
  open,
  product,
  onClose,
  onPublished,
}: ComposerFacebookPostModalProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permalinkUrl, setPermalinkUrl] = useState<string | null>(null);
  const [isPublishing, startPublishTransition] = useTransition();

  useEffect(() => {
    if (!open || !product) return;
    setDraft(buildProductPostDraft(product));
    setError(null);
    setPermalinkUrl(null);
  }, [open, product]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPublishing) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isPublishing, onClose]);

  if (!open || !product) return null;

  const priceLabel =
    product.price_usd != null ? formatUsd(product.price_usd) : "Sin precio";
  const canPublish = Boolean(draft.trim()) && Boolean(product.thumb_url);

  function handlePublish() {
    if (!canPublish || isPublishing) return;

    setError(null);
    startPublishTransition(async () => {
      try {
        const response = await fetch("/api/facebook/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product!.product_id,
            message: draft.trim(),
            imageUrl: product!.thumb_url,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          permalinkUrl?: string;
          publishedAt?: string;
        };

        if (!response.ok) {
          setError(data.error ?? "No se pudo publicar en Facebook.");
          return;
        }

        if (!data.permalinkUrl) {
          setError("Publicado, pero no se obtuvo el enlace del post.");
          return;
        }

        setPermalinkUrl(data.permalinkUrl);
        onPublished(
          product!.product_id,
          data.permalinkUrl,
          data.publishedAt ?? new Date().toISOString(),
        );
      } catch {
        setError("Error de red al publicar en Facebook.");
      }
    });
  }

  return (
    <div
      className="inbox-composer-modal-overlay"
      role="presentation"
      onClick={isPublishing ? undefined : onClose}
    >
      <div
        className="inbox-composer-modal inbox-composer-modal--publish"
        role="dialog"
        aria-modal="true"
        aria-label="Publicar en Facebook"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inbox-composer-modal-header">
          <div>
            <h2 className="inbox-composer-modal-title">Publicar en Facebook</h2>
            <p className="inbox-composer-modal-subtitle">
              {product.product_name} · {priceLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="inbox-composer-modal-close"
            aria-label="Cerrar publicación"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="inbox-composer-publish-body">
          {product.thumb_url ? (
            <div className="inbox-composer-publish-preview">
              <Image
                src={product.thumb_url}
                alt={product.image_alt ?? product.product_name}
                width={96}
                height={96}
                className="inbox-composer-publish-preview-image"
              />
              <p className="inbox-composer-publish-preview-note">
                Esta imagen se publicará en tu página de Facebook.
              </p>
            </div>
          ) : (
            <p className="inbox-composer-publish-warning">
              Añade una imagen al producto para poder publicarlo en Facebook.
            </p>
          )}

          <label className="inbox-composer-publish-label">
            Texto del post
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={6}
              disabled={isPublishing || Boolean(permalinkUrl)}
              className="inbox-composer-publish-input"
              placeholder="Escribe el mensaje de la publicación…"
            />
          </label>

          {error && <p className="inbox-composer-publish-error">{error}</p>}

          {permalinkUrl && (
            <div className="inbox-composer-publish-success">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="inbox-composer-publish-success-title">Publicado</p>
                <a
                  href={permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inbox-composer-publish-success-link"
                >
                  Ver en Facebook
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
        </div>

        <footer className="inbox-composer-publish-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="inbox-composer-publish-btn inbox-composer-publish-btn--ghost"
          >
            {permalinkUrl ? "Cerrar" : "Cancelar"}
          </button>
          {!permalinkUrl && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
              className="inbox-composer-publish-btn inbox-composer-publish-btn--primary"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Publicando…
                </>
              ) : (
                "Publicar"
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
