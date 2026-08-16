"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Baby,
  Bell,
  Car,
  Cpu,
  HeartPulse,
  Home,
  NotebookPen,
  Package,
  Percent,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserRound,
  Utensils,
  Watch,
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

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>
> = {
  electronica: Cpu,
  hogar: Home,
  belleza: Sparkles,
  accesorios: Watch,
  alimentos: Utensils,
  ropa: Shirt,
  salud: HeartPulse,
  juguetes: Baby,
  papeleria: NotebookPen,
  automotriz: Car,
  otros: Package,
};

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
    if (window.location.hash === "#mercado-categorias") {
      document
        .getElementById("mercado-categorias")
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

  const searchForm = (
    <form
      className="mercado-mp-search"
      onSubmit={(event) => {
        event.preventDefault();
        goDirectorySearch();
      }}
    >
      <span className="mercado-mp-search-icon" aria-hidden="true">
        <Search className="h-5 w-5" />
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar en la vitrina Moriche…"
        aria-label="Buscar productos"
        className="mercado-mp-search-input"
        disabled={pending}
      />
      <button type="submit" className="mercado-mp-search-btn" disabled={pending}>
        Buscar
      </button>
    </form>
  );

  return (
    <div className={cn("mercado-shell", pending && "mercado-shell-pending")}>
      <header className="mercado-mp-header">
        <div className="mercado-mp-header-top">
          <Link href="/mercado-oculto" className="mercado-mp-brand" prefetch>
            <span className="mercado-brand-mark" aria-hidden="true">
              M
            </span>
            <span className="mercado-mp-brand-text">
              <span className="mercado-mp-brand-kicker">Curaduría B2B</span>
              <span className="mercado-title">Mercado Moriche</span>
            </span>
          </Link>

          <div className="mercado-mp-search-wrap">{searchForm}</div>

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
              <span className="mercado-nav-label">Mis Compras</span>
            </Link>
            <Link
              href="/mercado-oculto/conversaciones"
              prefetch
              className="mercado-nav-link"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Notificaciones</span>
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
                <span className="mercado-nav-label">Mi cuenta</span>
              </Link>
            ) : (
              <Link
                href="/dashboard/login?next=/mercado-oculto"
                className="mercado-nav-link mercado-mp-auth-link"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Crea tu cuenta / Ingresa</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {onDirectory ? (
        <div
          id="mercado-categorias"
          className="mercado-mp-cat-strip"
          role="tablist"
          aria-label="Categorías"
        >
          <div className="mercado-mp-cat-scroll">
            <button
              type="button"
              role="tab"
              aria-selected={!activeCategory}
              className={cn(
                "mercado-mp-cat-chip",
                !activeCategory && "mercado-mp-cat-chip-active",
              )}
              onClick={() =>
                catalog?.setFilters((current) => ({
                  ...current,
                  category: "",
                }))
              }
            >
              <span className="mercado-mp-cat-icon" aria-hidden="true">
                <Percent className="h-5 w-5" />
              </span>
              <span>Ofertas</span>
            </button>
            {SUPPLIER_PRODUCT_CATEGORIES.map((item) => {
              const Icon = CATEGORY_ICONS[item.value] ?? Package;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === item.value}
                  className={cn(
                    "mercado-mp-cat-chip",
                    activeCategory === item.value && "mercado-mp-cat-chip-active",
                  )}
                  onClick={() =>
                    catalog?.setFilters((current) => ({
                      ...current,
                      category: item.value,
                    }))
                  }
                >
                  <span className="mercado-mp-cat-icon" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
