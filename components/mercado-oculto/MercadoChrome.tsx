"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Bell,
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
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { MercadoBrowseHero } from "@/components/mercado-oculto/MercadoBrowseHero";
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
  const onProduct = pathname.includes("/mercado-oculto/producto/");
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
    <div
      className={cn(
        "mercado-shell",
        pending && "mercado-shell-pending",
        onProduct && "storefront-mp-shell--product",
      )}
    >
      <MercadoBrandHeader
        brandHref="/mercado-oculto"
        brandMarkText="M"
        brandKicker="Curaduría mayorista"
        brandTitle="Moriche"
        scrollMode={onProduct ? "fade-with-scroll" : "hide-on-down"}
        nav={
          <>
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
          </>
        }
      />

      {onDirectory ? (
        <MercadoBrowseHero
          kicker="Mercado Moriche"
          title={
            <>
              La vitrina mayorista
              <span className="mercado-hero-title-accent">
                {" "}
                que se siente exclusiva.
              </span>
            </>
          }
          titleId="moriche-hero-title"
          lead="Curaduría B2B para dropshippers: productos listos, márgenes claros y una experiencia de compra que no parece un mercado masivo."
          searchQuery={query}
          onSearchQueryChange={setQuery}
          onSearchSubmit={goDirectorySearch}
          searchAriaLabel="Buscar en Mercado Moriche"
          pending={pending}
          categories={SUPPLIER_PRODUCT_CATEGORIES.map((item) => ({
            id: item.value,
            label: item.label,
          }))}
          activeCategoryId={activeCategory || null}
          onSelectCategory={(id) =>
            catalog?.setFilters((current) => ({
              ...current,
              category: id ?? "",
            }))
          }
        />
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
