"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { LandingHeaderLogo } from "@/components/landing/LandingHeaderLogo";
import { LandingLoginMenu } from "@/components/landing/LandingLoginMenu";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";
import { scrollToLandingHash } from "@/lib/landing/scroll-to-hash";

const navLinks = [
  { href: "#experiencia", label: "¿Cómo funciona" },
  { href: "#para-quien", label: "Empezar" },
  { href: "#precios", label: "Precios" },
  { href: SUPPLIER_ZONE_HREF, label: "Proveedores" },
] as const;

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

  /** Al cargar `/#precios` (o tras navegación cliente), alinear con el header fijo. */
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#") || hash.length < 2) return;

    const timer = window.setTimeout(() => {
      scrollToLandingHash(hash, { updateHistory: false });
    }, 40);

    return () => window.clearTimeout(timer);
  }, []);

  function handleHashClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    { closeMenu = false }: { closeMenu?: boolean } = {},
  ) {
    if (!href.startsWith("#")) return;

    event.preventDefault();

    const runScroll = () => {
      scrollToLandingHash(href);
    };

    if (closeMenu && open) {
      setOpen(false);
      window.setTimeout(runScroll, 60);
      return;
    }

    runScroll();
  }

  return (
    <header
      className={`landing-header fixed inset-x-0 top-0 z-50 transition-all safe-area-inset ${
        scrolled
          ? "border-b border-zinc-200/80 bg-white/95 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md"
          : "border-b border-transparent bg-[#FAFAF9]/95 backdrop-blur-sm"
      }`}
    >
      <div className="page-container flex min-h-[4.5rem] items-center justify-between gap-4 py-2.5 md:min-h-20 md:py-3 lg:min-h-[5.25rem] lg:py-3.5">
        <LandingHeaderLogo />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegación principal"
        >
          {navLinks.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleHashClick(event, link.href)}
                className="landing-nav-link"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className="landing-nav-link"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LandingLoginMenu variant="desktop" />
          <Link
            href={MERCHANT_SIGNUP_HREF}
            prefetch={true}
            className="btn-brand ml-2 gap-2 px-4 touch-manipulation"
          >
            Crear tienda gratis
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="touch-target touch-manipulation rounded-lg text-zinc-700 active:scale-95 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200/70 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Menú móvil">
            {navLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) =>
                    handleHashClick(event, link.href, { closeMenu: true })
                  }
                  className="landing-nav-link justify-start px-2 py-3 text-base"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className="landing-nav-link touch-manipulation justify-start px-2 py-3 text-base"
                >
                  {link.label}
                </Link>
              ),
            )}
            <LandingLoginMenu
              variant="mobile"
              onNavigate={() => setOpen(false)}
            />
            <Link
              href={MERCHANT_SIGNUP_HREF}
              prefetch={true}
              onClick={() => setOpen(false)}
              className="btn-brand mt-3 gap-2 touch-manipulation"
            >
              Crear tienda gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
