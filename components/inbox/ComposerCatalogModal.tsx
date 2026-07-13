"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ExternalLink, MessageSquarePlus, Search, X } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { ProductFacebookPostSummary } from "@/lib/facebook/get-store-facebook-posts";
import { formatUsd } from "@/lib/format";
import { ComposerFacebookPostModal } from "@/components/inbox/ComposerFacebookPostModal";

interface ComposerCatalogModalProps {
  open: boolean;
  products: CatalogListItem[];
  hasMessengerIntegration?: boolean;
  publishedPosts?: Record<string, ProductFacebookPostSummary>;
  onClose: () => void;
  onSelectProduct: (snippet: string) => void;
  onPostPublished?: (
    productId: string,
    permalinkUrl: string,
    publishedAt: string,
  ) => void;
}

export function ComposerCatalogModal({
  open,
  products,
  hasMessengerIntegration = false,
  publishedPosts = {},
  onClose,
  onSelectProduct,
  onPostPublished,
}: ComposerCatalogModalProps) {
  const [query, setQuery] = useState("");
  const [publishProduct, setPublishProduct] = useState<CatalogListItem | null>(
    null,
  );
  const [localPublishedPosts, setLocalPublishedPosts] = useState(publishedPosts);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPublishProduct(null);
    }
  }, [open]);

  useEffect(() => {
    setLocalPublishedPosts(publishedPosts);
  }, [publishedPosts]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !publishProduct) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, publishProduct, onClose]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products.slice(0, 40);

    return products
      .filter((product) =>
        product.product_name.toLowerCase().includes(normalized),
      )
      .slice(0, 40);
  }, [products, query]);

  if (!open) return null;

  function handleSelect(product: CatalogListItem) {
    const price =
      product.price_usd != null ? formatUsd(product.price_usd) : "Consultar precio";
    onSelectProduct(
      `Te recomiendo *${product.product_name}* (${price}). ¿Te lo aparto?`,
    );
    onClose();
  }

  function handlePublished(
    productId: string,
    permalinkUrl: string,
    publishedAt: string,
  ) {
    setLocalPublishedPosts((current) => ({
      ...current,
      [productId]: { postId: productId, permalinkUrl, publishedAt },
    }));
    onPostPublished?.(productId, permalinkUrl, publishedAt);
  }

  return (
    <>
      <div
        className="inbox-composer-modal-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="inbox-composer-modal inbox-composer-modal--catalog"
          role="dialog"
          aria-modal="true"
          aria-label="Catálogo de productos"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="inbox-composer-modal-header">
            <div>
              <h2 className="inbox-composer-modal-title">Catálogo</h2>
              <p className="inbox-composer-modal-subtitle">
                Inserta en el chat o publica directo en tu página de Facebook.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inbox-composer-modal-close"
              aria-label="Cerrar catálogo"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <label className="inbox-composer-modal-search">
            <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto…"
              className="inbox-composer-modal-search-input"
            />
          </label>

          <ul className="inbox-composer-modal-list">
            {filteredProducts.length === 0 ? (
              <li className="inbox-composer-modal-empty">
                Sin productos disponibles.
              </li>
            ) : (
              filteredProducts.map((product) => {
                const published = localPublishedPosts[product.product_id];

                return (
                  <li key={product.product_id} className="inbox-composer-catalog-row">
                    <div className="inbox-composer-catalog-row-main">
                      {product.thumb_url ? (
                        <Image
                          src={product.thumb_url}
                          alt={product.image_alt ?? product.product_name}
                          width={40}
                          height={40}
                          className="inbox-composer-catalog-thumb"
                        />
                      ) : (
                        <span className="inbox-composer-catalog-thumb inbox-composer-catalog-thumb--empty" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="inbox-composer-modal-item-name min-w-0 flex-1">
                            {product.product_name}
                          </span>
                          {published && (
                            <a
                              href={published.permalinkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inbox-composer-published-badge"
                              title="Ver publicación en Facebook"
                            >
                              <Check className="h-3 w-3" aria-hidden="true" />
                              Publicado
                              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                        <span className="inbox-composer-modal-item-meta">
                          {product.price_usd != null
                            ? formatUsd(product.price_usd)
                            : "Sin precio"}
                          {product.available_stock <= 0 ? " · Agotado" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="inbox-composer-catalog-actions">
                      <button
                        type="button"
                        onClick={() => handleSelect(product)}
                        className="inbox-composer-catalog-action inbox-composer-catalog-action--chat"
                      >
                        <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
                        Insertar en chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublishProduct(product)}
                        disabled={!hasMessengerIntegration}
                        title={
                          hasMessengerIntegration
                            ? "Publicar en tu página de Facebook"
                            : "Conecta Facebook Messenger en Integraciones"
                        }
                        className="inbox-composer-catalog-action inbox-composer-catalog-action--facebook"
                      >
                        Publicar en Facebook
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <ComposerFacebookPostModal
        open={Boolean(publishProduct)}
        product={publishProduct}
        onClose={() => setPublishProduct(null)}
        onPublished={handlePublished}
      />
    </>
  );
}
