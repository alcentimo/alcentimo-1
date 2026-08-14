"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

interface MercadoSearchFormProps {
  initialQuery: string;
}

export function MercadoSearchForm({ initialQuery }: MercadoSearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  return (
    <form
      className="mercado-search"
      onSubmit={(event) => {
        event.preventDefault();
        const next = query.trim();
        startTransition(() => {
          router.replace(
            next
              ? `/mercado-oculto?q=${encodeURIComponent(next)}`
              : "/mercado-oculto",
          );
        });
      }}
    >
      <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar producto, tienda o categoría…"
        aria-label="Buscar en el mercado oculto"
        className="mercado-search-input"
      />
      <button type="submit" className="btn-brand-outline !min-h-9 !px-3 !text-xs">
        Buscar
      </button>
    </form>
  );
}
