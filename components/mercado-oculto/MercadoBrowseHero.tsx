"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MercadoHeroCategory {
  id: string;
  label: string;
}

export interface MercadoBrowseHeroProps {
  kicker: string;
  title: ReactNode;
  titleId?: string;
  lead?: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  pending?: boolean;
  categories: MercadoHeroCategory[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  allLabel?: string;
  collectionsId?: string;
  className?: string;
}

/**
 * Hero de búsqueda + píldoras (mismo markup/CSS que Mercado Oculto).
 */
export function MercadoBrowseHero({
  kicker,
  title,
  titleId = "mercado-hero-title",
  lead = null,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  searchPlaceholder = "Buscar por producto o categoría…",
  searchAriaLabel = "Buscar en el catálogo",
  pending = false,
  categories,
  activeCategoryId,
  onSelectCategory,
  allLabel = "Toda la vitrina",
  collectionsId = "mercado-colecciones",
  className,
}: MercadoBrowseHeroProps) {
  return (
    <section
      className={cn("mercado-hero", className)}
      aria-labelledby={titleId}
    >
      <div className="mercado-hero-glow" aria-hidden="true" />
      <div className="mercado-hero-inner">
        <p className="mercado-hero-kicker">{kicker}</p>
        <h1 id={titleId} className="mercado-hero-title">
          {title}
        </h1>
        {lead ? <p className="mercado-hero-lead">{lead}</p> : null}

        <form
          className="mercado-hero-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <span className="mercado-hero-search-icon" aria-hidden="true">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="mercado-hero-search-input"
            disabled={pending}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button
            type="submit"
            className="mercado-hero-search-btn"
            disabled={pending}
          >
            Explorar
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        {categories.length > 0 ? (
          <div
            id={collectionsId}
            className="mercado-hero-collections"
            role="tablist"
            aria-label="Colecciones"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategoryId == null}
              className={cn(
                "mercado-hero-collection",
                activeCategoryId == null && "is-active",
              )}
              onClick={() => onSelectCategory(null)}
            >
              {allLabel}
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeCategoryId === item.id}
                className={cn(
                  "mercado-hero-collection",
                  activeCategoryId === item.id && "is-active",
                )}
                onClick={() => onSelectCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
