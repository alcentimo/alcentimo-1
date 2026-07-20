"use client";

import { Search } from "lucide-react";

interface CatalogToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
}

export function CatalogToolbar({
  query,
  onQueryChange,
  resultCount,
}: CatalogToolbarProps) {
  return (
    <div className="store-toolbar">
      <div className="store-search-wrap">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar productos…"
          className="store-search-input"
          aria-label="Buscar productos"
        />
      </div>

      <p className="store-result-count">
        {resultCount} producto{resultCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
