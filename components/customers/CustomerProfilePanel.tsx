"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";

interface CustomerProfilePanelProps {
  storeSlug: string;
  storeName: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
}

export function CustomerProfilePanel({
  storeSlug,
  storeName,
  email,
  displayName,
  phone,
}: CustomerProfilePanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    setPending(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.push(`/c/${storeSlug}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card-panel space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Tienda
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {storeName}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Email
          </p>
          <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
            {email ?? "—"}
          </p>
        </div>
        {displayName ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Nombre
            </p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {displayName}
            </p>
          </div>
        ) : null}
        {phone ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Teléfono
            </p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
              {phone}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        ¿Quieres actualizar tus datos?{" "}
        <Link
          href={buildCustomerRegisterPath(storeSlug, `/c/${storeSlug}/perfil`)}
          className="link-brand"
        >
          Ir al registro
        </Link>
      </p>
    </div>
  );
}
