import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface AdminChromeProps {
  email: string | null;
  children: React.ReactNode;
}

/** Shell exclusivo del panel admin: sin sidebar de tienda ni catálogo. */
export function AdminChrome({ email, children }: AdminChromeProps) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo href="/admin/dashboard" size="sm" showName={false} />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Administración
              </p>
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Panel Admin
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {email ? (
              <span className="truncate text-zinc-500 dark:text-zinc-400">
                {email}
              </span>
            ) : null}
            <Link
              href="/admin/dashboard"
              className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Resumen
            </Link>
            <Link
              href="/dashboard/catalogo"
              className="font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Ir a mi tienda
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
