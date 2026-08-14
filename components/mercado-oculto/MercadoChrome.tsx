"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell, Search, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { cn } from "@/lib/cn";
import {
  MercadoCartProvider,
  useMercadoCart,
} from "@/components/mercado-oculto/MercadoCartProvider";

interface MercadoChromeProps {
  email: string | null;
  children: React.ReactNode;
}

function MercadoChromeInner({ email, children }: MercadoChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { itemCount, ready } = useMercadoCart();

  const onDirectory =
    pathname === "/mercado-oculto" || pathname === "/mercado-oculto/";
  const onPurchases = pathname.startsWith("/mercado-oculto/conversaciones");
  const onCart = pathname.startsWith("/mercado-oculto/carrito");
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
        <div className="mercado-mp-trustbar">
          <span>Envío a nivel nacional</span>
          <span aria-hidden="true">·</span>
          <span>Compra protegida</span>
          <span aria-hidden="true">·</span>
          <span>Mayorista Oficial Alcéntimo</span>
        </div>

        <div className="mercado-mp-header-top">
          <Link href="/mercado-oculto" className="mercado-mp-brand">
            <span className="mercado-brand-mark" aria-hidden="true">
              a
            </span>
            <span className="min-w-0">
              <span className="mercado-eyebrow">Alcéntimo</span>
              <span className="mercado-title block">Mercado oculto</span>
            </span>
          </Link>

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
              placeholder="Buscar productos, marcas y más…"
              aria-label="Buscar productos"
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

          <nav className="mercado-mp-nav" aria-label="Cuenta y compras">
            <Link
              href="/mercado-oculto/conversaciones"
              className={cn(
                "mercado-nav-link",
                onPurchases && "mercado-nav-link-active",
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Mis Compras
            </Link>
            <Link
              href="/mercado-oculto/conversaciones"
              className="mercado-nav-link"
              aria-label="Notificaciones"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              Notificaciones
            </Link>
            <Link
              href="/mercado-oculto/carrito"
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
              Carrito
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
                Mi cuenta
              </Link>
            ) : (
              <Link
                href="/dashboard/login?next=/mercado-oculto"
                className="mercado-nav-link mercado-mp-auth-link"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Crea tu cuenta / Ingresa
              </Link>
            )}
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

export function MercadoChrome({ email, children }: MercadoChromeProps) {
  return (
    <MercadoCartProvider>
      <MercadoChromeInner email={email}>{children}</MercadoChromeInner>
    </MercadoCartProvider>
  );
}
