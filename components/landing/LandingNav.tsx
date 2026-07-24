"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

const navLinks = [
  { href: "#experiencia", label: "Producto" },
  { href: "#marca-blanca", label: "Marca blanca" },
  { href: "#precios", label: "Precios" },
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
      className={`fixed inset-x-0 top-0 z-50 transition-all safe-area-inset ${
        scrolled
          ? "border-b border-zinc-200/70 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/90"
          : "border-b border-transparent bg-[#FAFAF9]/90 backdrop-blur-sm dark:bg-zinc-950/80"
      }`}
    >
      <div className="page-container flex h-14 items-center justify-between gap-4 lg:h-16">
        <BrandLogo href="/" size="lg" />

        <nav
          className="hidden items-center gap-0.5 md:flex"
          aria-label="Navegación principal"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/dashboard/login" className="landing-nav-link">
            Iniciar sesión
          </Link>
          <Link
            href="/dashboard/productos/nuevo"
            className="btn-brand ml-1 gap-2 px-4"
          >
            Comenzar gratis
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="touch-target rounded-lg text-zinc-700 md:hidden dark:text-zinc-300"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200/70 bg-white px-4 py-4 md:hidden dark:border-zinc-800/70 dark:bg-zinc-950">
          <nav className="flex flex-col gap-0.5" aria-label="Menú móvil">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="landing-nav-link justify-start px-2 py-3 text-base"
              >
                {link.label}
              </a>
            ))}
            <hr className="my-2 border-zinc-200/70 dark:border-zinc-800/70" />
            <Link
              href="/dashboard/login"
              onClick={() => setOpen(false)}
              className="landing-nav-link justify-start px-2 py-3 text-base"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/dashboard/productos/nuevo"
              onClick={() => setOpen(false)}
              className="btn-brand mt-2 gap-2"
            >
              Comenzar gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
