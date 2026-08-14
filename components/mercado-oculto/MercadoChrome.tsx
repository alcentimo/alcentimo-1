"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { cn } from "@/lib/cn";

interface MercadoChromeProps {
  email: string | null;
  children: React.ReactNode;
}

export function MercadoChrome({ email, children }: MercadoChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const onDirectory =
    pathname === "/mercado-oculto" || pathname === "/mercado-oculto/";
  const onChats = pathname.startsWith("/mercado-oculto/conversaciones");
  const activeCategory = searchParams.get("category") ?? "";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function navigateWithParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/mercado-oculto?${qs}` : "/mercado-oculto");
    });
  }

  return (
    <div className="mercado-shell">
      <header className="mercado-mp-header">
        <div className="mercado-mp-header-top">
          <Link href="/mercado-oculto" className="mercado-mp-brand">
            <span className="mercado-brand-mark" aria-hidden="true">
              a
            </span>
            <span className="min-w-0">
              <span className="mercado-eyebrow">Alcéntimo · B2B</span>
              <span className="mercado-title block">Mercado oculto</span>
            </span>
          </Link>

          {onDirectory ? (
            <form
              className="mercado-mp-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigateWithParams((params) => {
                  const next = query.trim();
                  if (next) params.set("q", next);
                  else params.delete("q");
                });
              }}
            >
              <span className="mercado-mp-search-icon" aria-hidden="true">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar productos mayoristas, categorías…"
                aria-label="Buscar en el mercado oculto"
                className="mercado-mp-search-input"
                disabled={pending}
              />
              <button
                type="submit"
                className="mercado-mp-search-btn"
                disabled={pending}
              >
                Buscar
              </button>
            </form>
          ) : (
            <div className="flex-1" />
          )}

          <nav className="mercado-mp-nav">
            {email ? (
              <span className="hidden max-w-[10rem] truncate text-xs text-zinc-500 lg:inline">
                {email}
              </span>
            ) : null}
            <Link
              href="/mercado-oculto"
              className={cn(
                "mercado-nav-link",
                onDirectory && "mercado-nav-link-active",
              )}
            >
              Catálogo
            </Link>
            <Link
              href="/mercado-oculto/conversaciones"
              className={cn(
                "mercado-nav-link",
                onChats && "mercado-nav-link-active",
              )}
            >
              Chats
            </Link>
            <Link href="/admin/dashboard" className="mercado-nav-link">
              Admin
            </Link>
          </nav>
        </div>

        {onDirectory ? (
          <div
            className="mercado-mp-categories"
            role="tablist"
            aria-label="Categorías"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!activeCategory}
              className={cn(
                "mercado-mp-category",
                !activeCategory && "mercado-mp-category-active",
              )}
              onClick={() =>
                navigateWithParams((params) => {
                  params.delete("category");
                })
              }
            >
              Todas
            </button>
            {SUPPLIER_PRODUCT_CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={activeCategory === item.value}
                className={cn(
                  "mercado-mp-category",
                  activeCategory === item.value && "mercado-mp-category-active",
                )}
                onClick={() =>
                  navigateWithParams((params) => {
                    params.set("category", item.value);
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      <main className="mercado-main mercado-mp-main">{children}</main>
    </div>
  );
}
