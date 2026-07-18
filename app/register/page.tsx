import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { CustomerRegisterPanel } from "@/components/customers/CustomerRegisterPanel";
import {
  buildCustomerAccountPath,
  buildCustomerRegisterPath,
} from "@/lib/customers/middleware-access";
import { resolveCustomerStoreSlugFromNext } from "@/lib/customers/ensure-customer-profile";
import { isValidCustomerPhone } from "@/lib/customers/phone-auth";
import { getPublicStoreBySlug } from "@/lib/stores";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RegisterPageProps {
  searchParams: Promise<{
    store?: string;
    next?: string;
    complete?: string;
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

function resolveSuggestedDisplayName(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (metadata && typeof metadata.display_name === "string") {
    const value = metadata.display_name.trim();
    if (value.length >= 2) return value;
  }

  if (metadata && typeof metadata.full_name === "string") {
    const value = metadata.full_name.trim();
    if (value.length >= 2) return value;
  }

  return null;
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
  const needsPhoneCompletion = params.complete === "phone";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let suggestedDisplayName: string | null = null;

  if (needsPhoneCompletion) {
    if (!user) {
      redirect(buildCustomerRegisterPath(store.slug, nextPath));
    }

    suggestedDisplayName = resolveSuggestedDisplayName(user.user_metadata);

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("phone")
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle();

    if (profile?.phone && isValidCustomerPhone(profile.phone)) {
      redirect(nextPath);
    }
  }

  return (
    <AuthPageShell
      sectionLabel="Cuenta de cliente"
      title={
        needsPhoneCompletion
          ? "Confirma tu WhatsApp"
          : "Regístrate y compra más rápido"
      }
      description={
        needsPhoneCompletion
          ? `Activa tu cuenta en ${store.name} con tu número de contacto.`
          : `Sin contraseñas: Google o solo nombre + WhatsApp en ${store.name}.`
      }
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
        needsPhoneCompletion={needsPhoneCompletion}
        suggestedDisplayName={suggestedDisplayName}
      />
    </AuthPageShell>
  );
}
