import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { CustomerRegisterPanel } from "@/components/customers/CustomerRegisterPanel";
import {
  buildCustomerAccountPath,
  buildCustomerRegisterPath,
} from "@/lib/customers/middleware-access";
import { resolveCustomerStoreSlugFromNext } from "@/lib/customers/ensure-customer-profile";
import { getPublicStoreBySlug } from "@/lib/stores";

export const dynamic = "force-dynamic";

interface RegisterPageProps {
  searchParams: Promise<{
    store?: string;
    next?: string;
  }>;
}

function resolveNextPath(storeSlug: string, nextParam?: string): string {
  const fallback = buildCustomerAccountPath(storeSlug);
  if (!nextParam?.startsWith("/") || nextParam.startsWith("//")) {
    return fallback;
  }

  const resolvedSlug = resolveCustomerStoreSlugFromNext(nextParam, storeSlug);
  if (resolvedSlug !== storeSlug) {
    return fallback;
  }

  return nextParam.split("?")[0] ?? fallback;
}

export default async function CustomerRegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const storeSlug = params.store?.trim().toLowerCase();

  if (!storeSlug) {
    return (
      <AuthPageShell
        sectionLabel="Cuenta de cliente"
        title="Enlace de registro inválido"
        description="Usa el enlace que te compartió la tienda para crear tu cuenta."
        footer={
          <p className="text-center text-sm text-zinc-500">
            <Link href="/" className="link-brand">
              Ir al inicio
            </Link>
          </p>
        }
      >
        <div className="card-panel mx-auto max-w-md text-center text-sm text-zinc-600 dark:text-zinc-300">
          Falta el parámetro <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">store</code>.
          Ejemplo:{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
            /register?store=mi-tienda
          </code>
        </div>
      </AuthPageShell>
    );
  }

  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) notFound();

  const nextPath = resolveNextPath(store.slug, params.next);

  return (
    <AuthPageShell
      sectionLabel="Cuenta de cliente"
      title="Regístrate para comprar"
      description={`Crea tu cuenta en ${store.name} para guardar tus datos y hacer pedidos.`}
      footer={
        <p className="text-center text-sm text-zinc-500">
          ¿Vendes productos?{" "}
          <Link href="/dashboard/login" className="link-brand">
            Accede al panel del negocio
          </Link>
        </p>
      }
    >
      <CustomerRegisterPanel
        storeSlug={store.slug}
        storeName={store.name}
        nextPath={nextPath}
      />
    </AuthPageShell>
  );
}
