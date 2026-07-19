import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LandingCta() {
  return (
    <section className="section-padding border-t border-zinc-200/60 pb-20 sm:pb-24 dark:border-zinc-800/60">
      <div className="page-container">
        <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-white shadow-lg shadow-emerald-500/10 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950">
          <CardContent className="px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Tu próximo cliente ya está en WhatsApp
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Crea tu catálogo hoy y comparte el enlace con quienes ya te
              compran. En minutos puedes estar recibiendo pedidos organizados.
            </p>
            <Link
              href="/dashboard/productos/nuevo"
              className="btn-brand mt-8 inline-flex gap-2 px-6 shadow-lg shadow-emerald-500/15"
            >
              Crear mi tienda gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
