import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerOrdersList } from "@/components/customers/CustomerOrdersList";
import { getCustomerOrdersForStore } from "@/lib/customers/get-customer-orders";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getPublicStoreBySlug } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CustomerAccountPageProps {
  params: Promise<{ store_slug: string }>;
}

export default async function CustomerAccountPage({
  params,
}: CustomerAccountPageProps) {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(buildCustomerRegisterPath(store.slug, `/c/${store.slug}/cuenta`));
  }

  const [{ data: profile }, orders] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("display_name, phone, created_at")
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle(),
    getCustomerOrdersForStore(store.id),
  ]);

  return (
    <main className="page-shell min-h-dvh safe-area-inset">
      <div className="mx-auto max-w-lg px-5 py-10 sm:px-7">
        <Link
          href={`/c/${store.slug}`}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Volver al catálogo
        </Link>

        <header className="mt-6 space-y-2">
          <p className="section-label">Tu cuenta</p>
          <h1 className="page-header-title">{store.name}</h1>
          <p className="page-header-desc">
            Hola{profile?.display_name ? `, ${profile.display_name}` : ""}.
            Aquí verás tus pedidos y datos de contacto.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Mis Pedidos
          </h2>
          <div className="card-panel mt-3">
            <CustomerOrdersList orders={orders} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Datos de contacto
          </h2>
          <div className="card-panel mt-3 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Email
              </p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                {user.email ?? "—"}
              </p>
            </div>
            {profile?.phone ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Teléfono
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {profile.phone}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
