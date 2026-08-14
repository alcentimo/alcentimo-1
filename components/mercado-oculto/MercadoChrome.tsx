"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface MercadoChromeProps {
  email: string | null;
  children: React.ReactNode;
}

export function MercadoChrome({ email, children }: MercadoChromeProps) {
  const pathname = usePathname();
  const onDirectory =
    pathname === "/mercado-oculto" || pathname === "/mercado-oculto/";
  const onChats = pathname.startsWith("/mercado-oculto/conversaciones");

  return (
    <div className="mercado-shell">
      <header className="mercado-header">
        <div className="mercado-header-inner">
          <div className="flex min-w-0 items-center gap-3">
            <span className="mercado-brand-mark" aria-hidden="true">
              m
            </span>
            <div className="min-w-0">
              <p className="mercado-eyebrow">Alcéntimo</p>
              <p className="mercado-title">Mercado oculto</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {email ? (
              <span className="mr-1 hidden max-w-[12rem] truncate text-xs text-zinc-500 sm:inline dark:text-zinc-400">
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
              Vitrina
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
            {email ? (
              <Link href="/dashboard/catalogo" className="mercado-nav-link">
                Dashboard
              </Link>
            ) : (
              <Link
                href="/dashboard/login?next=%2Fmercado-oculto"
                className="mercado-nav-link"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mercado-main">{children}</main>
    </div>
  );
}
