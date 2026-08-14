"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { resolveMercadoPublishDestination } from "@/lib/mercado-oculto/publish-gate";

export function MercadoPublishButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        className="btn-brand inline-flex items-center justify-center gap-2 !min-h-10 !text-sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await resolveMercadoPublishDestination();
            if (result.error) {
              setError(result.error);
              return;
            }
            if (result.href) {
              router.push(result.href);
            }
          });
        }}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        Publicar producto
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Requiere cuenta y suscripción. Integra productos de mayoristas
          oficiales.{" "}
          <Link href="/dashboard/planes" className="underline">
            Ver planes
          </Link>
        </p>
      )}
    </div>
  );
}
