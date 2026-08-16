"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Bell,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { cn } from "@/lib/cn";
import {
  MercadoCartProvider,
  useMercadoCart,
} from "@/components/mercado-oculto/MercadoCartProvider";
import { MercadoBottomNav } from "@/components/mercado-oculto/MercadoBottomNav";
import { useMercadoCatalogOptional } from "@/components/mercado-oculto/MercadoCatalogProvider";

interface MercadoChromeProps {
  email: string | null;
  children: React.ReactNode;
}

function MercadoChromeInner({ email, children }: MercadoChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [navPending, startNavTransition] = useTransition();
  const { itemCount, ready } = useMercadoCart();
  const catalog = useMercadoCatalogOptional();

  const onDirectory =
    pathname === "/mercado-oculto" || pathname === "/mercado-oculto/";
  const onPurchases = pathname.startsWith("/mercado-oculto/conversaciones");
  const onCart = pathname.startsWith("/mercado-oculto/carrito");
  const activeCategory = catalog?.filters.category ?? "";
  const [query, setQuery] = useState(catalog?.filters.q ?? "");

  useEffect(() => {
    setQuery(catalog?.filters.q ?? "");
  }, [catalog?.filters.q]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.location.hash === "#mercado-categorias" ||
      window.location.hash === "#mercado-colecciones"
    ) {
      document
        .getElementById("mercado-colecciones")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pathname]);

  function goDirectorySearch() {
    const next = query.trim();
    if (catalog && onDirectory) {
      catalog.setFilters((current) => ({ ...current, q: next }));
      return;
    }
    startNavTransition(() => {
      router.push(
        next
          ? `/mercado-oculto?q=${encodeURIComponent(next)}`
          : "/mercado-oculto",
      );
    });
  }

  const pending = Boolean(catalog?.pending) || navPending;

  return (
    <div className={cn("mercado-shell", pending && "mercado-shell-pending")}>
      <header className="mercado-mp-header">
        <div className="mercado-mp-header-top">
          <Link href="/mercado-oculto" className="mercado-mp-brand" prefetch>
            <span className="mercado-brand-mark" aria-hidden="true">
              M
            </span>
            <span className="mercado-mp-brand-text">
              <span className="mercado-mp-brand-kicker">Curaduría mayorista</span>
              <span className="mercado-title">Moriche</span>
            </span>
          </Link>

          <nav className="mercado-mp-nav" aria-label="Cuenta y compras">
            <Link
              href="/mercado-oculto/conversaciones"
              prefetch
              className={cn(
                "mercado-nav-link",
                onPurchases && "mercado-nav-link-active",
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Pedidos</span>
            </Link>
            <Link
              href="/mercado-oculto/conversaciones"
              prefetch
              className="mercado-nav-link"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Alertas</span>
            </Link>
            <Link
              href="/mercado-oculto/carrito"
              prefetch
              className={cn(
                "mercado-nav-link mercado-mp-cart-link",
                onCart && "mercado-nav-link-active",
              )}
              aria-label={
                ready
                  ? `Carrito, ${itemCount} artículos`
                  : "Carrito de compras"
              }
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Carrito</span>
              {ready && itemCount > 0 ? (
                <span className="mercado-mp-cart-badge">{itemCount}</span>
              ) : null}
            </Link>
            {email ? (
              <Link
                href="/admin/dashboard"
                className="mercado-nav-link"
                title={email}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Cuenta</span>
              </Link>
            ) : (
              <Link
                href="/dashboard/login?next=/mercado-oculto"
                className="mercado-nav-link mercado-mp-auth-link"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Entrar</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {onDirectory ? (
        <section className="mercado-hero" aria-labelledby="moriche-hero-title">
          <div className="mercado-hero-glow" aria-hidden="true" />
          <div className="mercado-hero-inner">
            <p className="mercado-hero-kicker">Mercado Moriche</p>
            <h1 id="moriche-hero-title" className="mercado-hero-title">
              La vitrina mayorista
              <span className="mercado-hero-title-accent"> que se siente exclusiva.</span>
            </h1>
            <p className="mercado-hero-lead">
              Curaduría B2B para dropshippers: productos listos, márgenes claros
              y una experiencia de compra que no parece un mercado masivo.
            </p>

            <form
              className="mercado-hero-search"
              onSubmit={(event) => {
                event.preventDefault();
                goDirectorySearch();
              }}
            >
              <span className="mercado-hero-search-icon" aria-hidden="true">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por producto o categoría…"
                aria-label="Buscar en Mercado Moriche"
                className="mercado-hero-search-input"
                disabled={pending}
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

            <div
              id="mercado-colecciones"
              className="mercado-hero-collections"
              role="tablist"
              aria-label="Colecciones"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!activeCategory}
                className={cn(
                  "mercado-hero-collection",
                  !activeCategory && "is-active",
                )}
                onClick={() =>
                  catalog?.setFilters((current) => ({
                    ...current,
                    category: "",
                  }))
                }
              >
                Toda la vitrina
              </button>
              {SUPPLIER_PRODUCT_CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === item.value}
                  className={cn(
                    "mercado-hero-collection",
                    activeCategory === item.value && "is-active",
                  )}
                  onClick={() =>
                    catalog?.setFilters((current) => ({
                      ...current,
                      category: item.value,
                    }))
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <main className="mercado-main mercado-mp-main">{children}</main>
      <MercadoBottomNav />
    </div>
  );
}

export function MercadoChrome({ email, children }: MercadoChromeProps) {
  return (
    <MercadoCartProvider>
      <MercadoChromeInner email={email}>{children}</MercadoChromeInner>
    </MercadoCartProvider>
  );
}
