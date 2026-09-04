"use client";

import { useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { useRegisterCatalogSearchFocus } from "@/components/catalog-transactional/CatalogShellNavigation";

interface StorefrontMarketplaceSearchProps {
  storeName: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  pending?: boolean;
}

/** Buscador central de la barra marketplace. */
export function StorefrontMarketplaceSearch({
  storeName,
  value,
  onChange,
  onSubmit,
  pending = false,
}: StorefrontMarketplaceSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.focus({ preventScroll: true }), 160);
  }, []);

  useRegisterCatalogSearchFocus(focusInput);

  return (
    <form
      className="storefront-mp-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
        document
          .getElementById("storefront-resultados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <span className="storefront-mp-search-icon" aria-hidden="true">
        <Search className="h-5 w-5" />
      </span>
      <input
        ref={inputRef}
        id="catalog-browse-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar productos, marcas y más…"
        aria-label={`Buscar en ${storeName}`}
        className="storefront-mp-search-input"
        aria-busy={pending || undefined}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button
        type="submit"
        className="storefront-mp-search-btn"
        disabled={pending}
        aria-label="Buscar"
      >
        <Search className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
      </button>
    </form>
  );
}
