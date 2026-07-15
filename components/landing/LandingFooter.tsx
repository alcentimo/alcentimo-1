import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-white safe-area-bottom dark:border-zinc-800 dark:bg-zinc-950">
      <div className="page-container py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <BrandLogo href="/" size="sm" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Infraestructura SaaS de gestión comercial para organizaciones que
              operan con precisión financiera y presencia digital profesional.
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-8 gap-y-3 text-sm"
            aria-label="Enlaces del pie de página"
          >
            <Link href="/dashboard/productos/nuevo" className="link-brand">
              Comenzar gratis
            </Link>
            <Link href="/dashboard/login" className="link-brand">
              Iniciar sesión
            </Link>
            <a href="#precios" className="link-brand">
              Precios
            </a>
            <Link href="/privacy" className="link-brand">
              Privacidad
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-zinc-100 pt-6 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          © {new Date().getFullYear()} alcentimo. Precios referenciales en USD con
          conversión Bs según tasa del día.
        </p>
      </div>
    </footer>
  );
}
