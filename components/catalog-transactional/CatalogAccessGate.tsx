"use client";

import { useState, useTransition } from "react";
import { Lock, Loader2 } from "lucide-react";
import { unlockCatalogWithPassword } from "@/lib/catalog-access/actions";

interface CatalogAccessGateProps {
  storeSlug: string;
  storeName: string;
  reason: "private" | "password_required";
}

/** Pantalla de bloqueo para catálogos privados o con contraseña. */
export function CatalogAccessGate({
  storeSlug,
  storeName,
  reason,
}: CatalogAccessGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await unlockCatalogWithPassword({
        storeSlug,
        password,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {reason === "private"
          ? "Catálogo privado"
          : "Catálogo protegido"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {reason === "private"
          ? `«${storeName}» no está disponible para el público. Si eres el comercio, inicia sesión en el panel o cambia el acceso en Ajustes.`
          : `«${storeName}» requiere una contraseña para ver los productos. Ideal para pruebas de dropshipping o catálogos mayoristas.`}
      </p>

      {reason === "password_required" ? (
        <form onSubmit={handleUnlock} className="mt-6 w-full space-y-3 text-left">
          <div>
            <label htmlFor="catalog-access-password" className="label-field">
              Contraseña de acceso
            </label>
            <input
              id="catalog-access-password"
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn-brand w-full"
            disabled={pending || !password.trim()}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Entrar al catálogo
          </button>
        </form>
      ) : null}
    </div>
  );
}
