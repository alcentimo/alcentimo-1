"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Users } from "lucide-react";
import { acceptStoreInvitationAction } from "@/lib/team/actions";
import { Button } from "@/components/ui/button";

interface AcceptInvitationPanelProps {
  token: string;
  storeName: string;
  roleLabel: string;
  invitedEmail: string;
  userEmail: string;
}

export function AcceptInvitationPanel({
  token,
  storeName,
  roleLabel,
  invitedEmail,
  userEmail,
}: AcceptInvitationPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const emailMatches =
    userEmail.trim().toLowerCase() === invitedEmail.trim().toLowerCase();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptStoreInvitationAction(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/catalogo");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Invitación a {storeName}
        </h2>
      </div>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Rol</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">{roleLabel}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Correo invitado</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">{invitedEmail}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Tu sesión actual</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {userEmail || "Sin correo"}
          </dd>
        </div>
      </dl>

      {!emailMatches ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          Esta invitación fue enviada a {invitedEmail}. Cierra sesión e ingresa con ese
          correo para aceptarla.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        className="btn-brand mt-5 h-10 w-full gap-2 sm:w-auto"
        disabled={pending || !emailMatches}
        onClick={handleAccept}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Unirme al equipo
      </Button>
    </div>
  );
}
