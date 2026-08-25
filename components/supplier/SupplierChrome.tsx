"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { SUPPLIER_LOGIN_PATH } from "@/lib/landing/supplier-zone-href";

interface SupplierChromeProps {
  email: string | null;
  showStorefrontSettings?: boolean;
  showMerchantStoreLink?: boolean;
  children: React.ReactNode;
}

/** Shell del hub de proveedores — suministro corporativo de Alcéntimo. */
export function SupplierChrome({
  email,
  showStorefrontSettings = false,
  showMerchantStoreLink = false,
  children,
}: SupplierChromeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [signingOut, setSigningOut] = useState(false);
  const tab = searchParams.get("tab");
  const onAjustes = pathname.startsWith("/proveedor/dashboard/ajustes");
  const onPedidos =
    pathname.startsWith("/proveedor") && tab === "pedidos" && !onAjustes;
  const onPagos =
    pathname.startsWith("/proveedor") && tab === "pagos" && !onAjustes;
  const onHistorial =
    pathname.startsWith("/proveedor") && tab === "historial" && !onAjustes;
  const onProductos =
    pathname.startsWith("/proveedor") &&
    !onPedidos &&
    !onPagos &&
    !onHistorial &&
    !onAjustes;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Aun si falla el signOut remoto, limpiar la vista local.
    }
    window.location.replace(SUPPLIER_LOGIN_PATH);
  }

  return (
    <div className="supplier-hub-shell">
      <header className="supplier-hub-header">
        <div className="supplier-hub-header-inner">
          <div className="flex min-w-0 items-center gap-3">
            <span className="supplier-hub-brand-mark" aria-hidden="true">
              a
            </span>
            <div className="min-w-0">
              <p className="supplier-hub-eyebrow">Alcéntimo · Suministro</p>
              <p className="supplier-hub-title">Hub de proveedores</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {email ? (
              <span className="mr-1 hidden max-w-[12rem] truncate text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                {email}
              </span>
            ) : null}
            <Link
              href="/proveedor/dashboard/hub"
              className={cn(
                "supplier-hub-nav-link",
                onProductos && "supplier-hub-nav-link-active",
              )}
            >
              Productos
            </Link>
            <Link
              href="/proveedor/dashboard/hub?tab=pedidos"
              className={cn(
                "supplier-hub-nav-link",
                onPedidos && "supplier-hub-nav-link-active",
              )}
            >
              Pedidos
            </Link>
            <Link
              href="/proveedor/dashboard/hub?tab=pagos"
              className={cn(
                "supplier-hub-nav-link",
                onPagos && "supplier-hub-nav-link-active",
              )}
            >
              Pagos
            </Link>
            <Link
              href="/proveedor/dashboard/hub?tab=historial"
              className={cn(
                "supplier-hub-nav-link",
                onHistorial && "supplier-hub-nav-link-active",
              )}
            >
              Historial
            </Link>
            {showMerchantStoreLink ? (
              <Link
                href="/dashboard/catalogo"
                className="supplier-hub-nav-link"
              >
                Panel de tienda
              </Link>
            ) : null}
            {showStorefrontSettings ? (
              <Link
                href="/proveedor/dashboard/ajustes"
                className={cn(
                  "supplier-hub-nav-link",
                  onAjustes && "supplier-hub-nav-link-active",
                )}
              >
                Tienda
              </Link>
            ) : null}
            <button
              type="button"
              className="supplier-hub-logout"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{signingOut ? "Saliendo…" : "Cerrar sesión"}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="supplier-hub-main">{children}</main>
    </div>
  );
}
