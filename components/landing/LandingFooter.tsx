import Link from "next/link";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200/70 bg-[#FAFAF9] safe-area-bottom dark:border-zinc-800/70 dark:bg-zinc-950">
      <div className="page-container py-10 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Tu propio negocio digital en minutos: elige productos listos para
              vender, arma tu tienda y vende por WhatsApp sin inventario.
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-8 gap-y-3 text-sm"
            aria-label="Enlaces del pie de página"
          >
            <Link href={MERCHANT_SIGNUP_HREF} className="link-brand">
              Crear mi tienda gratis
            </Link>
            <Link href={SUPPLIER_ZONE_HREF} className="link-brand">
              Zona de Proveedores
            </Link>
            <Link href="/dashboard/login" className="link-brand">
              Iniciar sesión
            </Link>
            <a href="#precios" className="link-brand">
              Precios
            </a>
            <Link href="/terms" className="link-brand">
              Términos y Condiciones
            </Link>
            <Link href="/privacy" className="link-brand">
              Política de Privacidad
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
