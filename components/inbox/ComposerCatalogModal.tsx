"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";

interface ComposerCatalogModalProps {
  open: boolean;
  products: CatalogListItem[];
  onClose: () => void;
  onSelectProduct: (snippet: string) => void;
}

export function ComposerCatalogModal({
  open,
  products,
  onClose,
  onSelectProduct,
}: ComposerCatalogModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

  return (
    <div className="inbox-composer-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="inbox-composer-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Catálogo de productos"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inbox-composer-modal-header">
          <div>
            <h2 className="inbox-composer-modal-title">Catálogo</h2>
            <p className="inbox-composer-modal-subtitle">
              Selecciona un producto para insertarlo en el mensaje.
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
            <li className="inbox-composer-modal-empty">Sin productos disponibles.</li>
          ) : (
            filteredProducts.map((product) => (
              <li key={product.product_id}>
                <button
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="inbox-composer-modal-item"
                >
                  <span className="inbox-composer-modal-item-name">
                    {product.product_name}
                  </span>
                  <span className="inbox-composer-modal-item-meta">
                    {product.price_usd != null
                      ? formatUsd(product.price_usd)
                      : "Sin precio"}
                    {product.available_stock <= 0 ? " · Agotado" : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
