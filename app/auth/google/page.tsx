import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { CentralizedGoogleAuthPanel } from "@/components/auth/CentralizedGoogleAuthPanel";
import { sanitizeAuthReturnUrl } from "@/lib/auth/validate-auth-return-url";
import { getPublicStoreBySlug } from "@/lib/stores";

export const dynamic = "force-dynamic";

interface GoogleAuthPageProps {
  searchParams: Promise<{
    next?: string;
    store?: string;
    orderId?: string;
  }>;
}

export default async function GoogleAuthPage({ searchParams }: GoogleAuthPageProps) {
  const params = await searchParams;
  const storeSlug = params.store?.trim().toLowerCase() || undefined;
  const orderId = params.orderId?.trim() || undefined;
  const nextPath = sanitizeAuthReturnUrl(params.next, storeSlug, "/dashboard");

  let storeName: string | null = null;
  if (storeSlug) {
    const store = await getPublicStoreBySlug(storeSlug);
    if (!store) {
      redirect("/dashboard/login?error=invalid_store");
    }
    storeName = store.name;
  }

  return (
    <AuthPageShell
      sectionLabel={storeName ? storeName : "Cuenta"}
      title="Continuar con Google"
      description={
        storeName
          ? `Inicia sesión para volver a ${storeName}. Te redirigiremos al catálogo al terminar.`
          : "Inicia sesión con tu cuenta de Google para continuar."
      }
      footer={
        <p className="text-center text-sm text-zinc-500">
          <Link href="/" className="link-brand">
            Ir al inicio
          </Link>
        </p>
      }
    >
      <CentralizedGoogleAuthPanel
        nextPath={nextPath}
        storeSlug={storeSlug}
        orderId={orderId}
      />
    </AuthPageShell>
  );
}
