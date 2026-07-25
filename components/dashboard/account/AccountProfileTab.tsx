"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { updateAccountProfileAction } from "@/lib/account/actions";
import { formatAccountStoreRole } from "@/lib/account/get-account-snapshot";
import type { AccountSnapshot } from "@/lib/account/types";

function formatMemberSince(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(
    new Date(value),
  );
}

interface AccountProfileTabProps {
  account: AccountSnapshot;
}

export function AccountProfileTab({ account }: AccountProfileTabProps) {
  const [displayName, setDisplayName] = useState(account.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const storeRoleLabel = formatAccountStoreRole(account);

  function handleSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateAccountProfileAction({ displayName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.displayName) {
        setDisplayName(result.displayName);
      }
      setSuccess("Perfil actualizado.");
    });
  }

  return (
    <SettingsTabShell hideSaveBar error={error}>
      {success ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <SettingsSection
        title="Datos de acceso"
        description="Información personal de tu cuenta en Alcentimo."
        variant="payments"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-email">Correo</Label>
            <Input
              id="account-email"
              type="email"
              value={account.email ?? ""}
              readOnly
              disabled
              className="bg-zinc-50 dark:bg-zinc-900/50"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              El correo de acceso no se puede cambiar desde aquí.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-display-name">Nombre visible</Label>
            <Input
              id="account-display-name"
              type="text"
              autoComplete="name"
              value={displayName}
              disabled={pending}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Plan
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {account.planName}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Miembro desde
            </p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">
              {formatMemberSince(account.memberSince)}
            </p>
          </div>

          {account.storeName ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Tienda activa
                </p>
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {account.storeName}
                </p>
              </div>
              {storeRoleLabel ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Rol en la tienda
                  </p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {storeRoleLabel}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            className="btn-brand gap-2"
            disabled={pending || !displayName.trim()}
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Guardar perfil
          </Button>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
