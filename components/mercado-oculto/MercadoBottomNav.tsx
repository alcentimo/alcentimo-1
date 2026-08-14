"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Grid2x2,
  Home,
  Menu,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  {
    href: "/mercado-oculto",
    label: "Inicio",
    icon: Home,
    match: (path: string) =>
      path === "/mercado-oculto" || path === "/mercado-oculto/",
  },
  {
    href: "/mercado-oculto?focus=categorias",
    label: "Categorías",
    icon: Grid2x2,
    match: (path: string) => false,
    scrollTo: "mercado-categorias",
  },
  {
    href: "/mercado-oculto/conversaciones",
    label: "Mis Compras",
    icon: ShoppingBag,
    match: (path: string) => path.startsWith("/mercado-oculto/conversaciones"),
  },
  {
    href: "/mercado-oculto/conversaciones",
    label: "Notificaciones",
    icon: Bell,
    match: () => false,
  },
  {
    href: "/admin/dashboard",
    label: "Más",
    icon: Menu,
    match: (path: string) => path.startsWith("/admin"),
  },
] as const;

export function MercadoBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="mercado-mp-bottom-nav" aria-label="Navegación principal">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn("mercado-mp-bottom-item", active && "is-active")}
            onClick={(event) => {
              if ("scrollTo" in item && item.scrollTo) {
                event.preventDefault();
                if (
                  pathname === "/mercado-oculto" ||
                  pathname === "/mercado-oculto/"
                ) {
                  document
                    .getElementById(item.scrollTo)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                  router.push("/mercado-oculto#mercado-categorias");
                }
              }
            }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
