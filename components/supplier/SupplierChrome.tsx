"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

interface SupplierChromeProps {
  email: string | null;
  children: React.ReactNode;
}

/** Shell del hub oculto de proveedores — identidad Alcéntimo. */
export function SupplierChrome({ email, children }: SupplierChromeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const onPedidos =
    pathname.startsWith("/proveedor") && tab === "pedidos";
  const onProductos = pathname.startsWith("/proveedor") && !onPedidos;

  return (
    <div className="supplier-hub-shell">
      <header className="supplier-hub-header">
        <div className="supplier-hub-header-inner">
          <div className="flex min-w-0 items-center gap-3">
            <span className="supplier-hub-brand-mark" aria-hidden="true">
              a
            </span>
            <div className="min-w-0">
              <p className="supplier-hub-eyebrow">Alcéntimo · Mayoristas</p>
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
              href="/proveedor/dashboard"
              className={cn(
                "supplier-hub-nav-link",
                onProductos && "supplier-hub-nav-link-active",
              )}
            >
              Productos
            </Link>
            <Link
              href="/proveedor/dashboard?tab=pedidos"
              className={cn(
                "supplier-hub-nav-link",
                onPedidos && "supplier-hub-nav-link-active",
              )}
            >
              Pedidos
            </Link>
          </div>
        </div>
      </header>
      <main className="supplier-hub-main">{children}</main>
    </div>
  );
}
