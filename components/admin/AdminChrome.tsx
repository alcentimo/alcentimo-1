import Link from "next/link";

interface AdminChromeProps {
  email: string | null;
  children: React.ReactNode;
}

/** Shell exclusivo del panel admin: sin sidebar de tienda ni catálogo. */
export function AdminChrome({ email, children }: AdminChromeProps) {
  return (
    <div className="min-h-dvh bg-zinc-50/80 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/admin/dashboard"
            className="truncate text-[15px] font-medium tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Alcéntimo
          </Link>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[13px]">
            {email ? (
              <span className="hidden truncate text-zinc-400 sm:inline dark:text-zinc-500">
                {email}
              </span>
            ) : null}
            <Link
              href="/mercado-oculto"
              className="font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Mercado oculto
            </Link>
            <Link
              href="/dashboard/catalogo"
              className="font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
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
