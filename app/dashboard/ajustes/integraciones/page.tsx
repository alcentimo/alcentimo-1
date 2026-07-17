import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function IntegracionesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/ajustes/integraciones");
  }

  const { store } = session;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardPageHeader
        sectionLabel="Configuración de Tienda"
        title="Integraciones"
        description={
          store
            ? `Canales conectados a tu operación · ${store.name}.`
            : "Canales conectados a tu operación."
        }
        storeSlug={store?.slug ?? null}
        before={
          <Link
            href="/dashboard/ajustes"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium link-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a configuración de tienda
          </Link>
        }
      />

      {!store ? (
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      ) : (
        <div className="settings-workspace">
          <div className="settings-workspace-body">
            <article className="card-panel max-w-2xl">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <MessageCircle className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    WhatsApp
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    Alcentimo usa WhatsApp mediante enlace directo (wa.me) con el
                    teléfono de tu tienda. Los clientes finalizan pedidos desde el
                    catálogo y tú recibes el mensaje en tu número habitual — sin API
                    oficial de Meta.
                  </p>
                  <Link
                    href="/dashboard/ajustes"
                    className="btn-brand-outline mt-5 inline-flex items-center gap-2"
                  >
                    Configurar teléfono en ajustes
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
