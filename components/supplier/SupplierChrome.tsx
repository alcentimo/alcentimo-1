import Link from "next/link";

interface SupplierChromeProps {
  email: string | null;
  children: React.ReactNode;
}

/** Shell del hub oculto de proveedores: sin nav de comerciantes. */
export function SupplierChrome({ email, children }: SupplierChromeProps) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Acceso interno
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Hub de proveedores
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {email ? (
              <span className="truncate text-zinc-500 dark:text-zinc-400">
                {email}
              </span>
            ) : null}
            <Link
              href="/proveedor/dashboard"
              className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Productos
            </Link>
            <Link
              href="/proveedor/dashboard?tab=pedidos"
              className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Pedidos
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-7">{children}</main>
    </div>
  );
}
