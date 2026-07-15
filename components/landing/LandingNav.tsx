"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

const navLinks = [
  { href: "#caracteristicas", label: "Características" },
  { href: "#precios", label: "Precios" },
  { href: "#tiendas", label: "Tiendas" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-shadow safe-area-inset dark:bg-zinc-950/90 ${
        scrolled
          ? "border-zinc-200/80 shadow-sm dark:border-zinc-800/80"
          : "border-transparent"
      }`}
    >
      <div className="page-container flex h-16 items-center justify-between gap-4 lg:h-[4.25rem]">
        <BrandLogo href="/" />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegación principal"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="nav-link px-3.5">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/dashboard/login" className="nav-link px-3">
            Iniciar sesión
          </Link>
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand gap-2 px-5 shadow-sm"
          >
            Comenzar gratis
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="touch-target rounded-xl text-zinc-700 md:hidden dark:text-zinc-300"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 shadow-lg md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <nav className="flex flex-col gap-1" aria-label="Menú móvil">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="nav-link w-full justify-start px-3 text-base"
              >
                {link.label}
              </a>
            ))}
            <hr className="my-2 border-zinc-200 dark:border-zinc-800" />
            <Link
              href="/dashboard/login"
              onClick={() => setOpen(false)}
              className="nav-link w-full justify-start px-3 text-base"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/dashboard/productos/nuevo"
              onClick={() => setOpen(false)}
              className="btn-brand mt-2 gap-2 shadow-sm"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
