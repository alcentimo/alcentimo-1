"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import {
  changeAccountPasswordAction,
  sendAccountPasswordSetupEmailAction,
} from "@/lib/account/actions";
import type { AccountSnapshot } from "@/lib/account/types";

const MIN_PASSWORD_LENGTH = 8;

interface AccountSecurityTabProps {
  account: AccountSnapshot;
}

export function AccountSecurityTab({ account }: AccountSecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();

  function handleChangePassword() {
    setError(null);
    setSuccess(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    startTransition(async () => {
      const result = await changeAccountPasswordAction({
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Contraseña actualizada correctamente.");
    });
  }

  function handleSendSetupEmail() {
    setError(null);
    setSuccess(null);
    startEmailTransition(async () => {
      const result = await sendAccountPasswordSetupEmailAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        `Te enviamos un enlace a ${account.email ?? "tu correo"} para crear una contraseña.`,
      );
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

      {account.hasPasswordLogin ? (
        <SettingsSection
          title="Cambiar contraseña"
          description="Usa tu contraseña actual para confirmar el cambio."
          variant="payments"
        >
          <div className="grid max-w-lg gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={currentPassword}
                disabled={pending}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={newPassword}
                disabled={pending}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                disabled={pending}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="btn-brand gap-2"
              disabled={
                pending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              onClick={handleChangePassword}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Actualizar contraseña
            </Button>
            <Link
              href="/dashboard/recuperar-contrasena"
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </SettingsSection>
      ) : (
        <SettingsSection
          title="Contraseña de acceso"
          description="Tu cuenta usa inicio de sesión con Google. Puedes crear una contraseña adicional por correo."
          variant="payments"
        >
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={emailPending || !account.email}
            onClick={handleSendSetupEmail}
          >
            {emailPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Enviar enlace para crear contraseña
          </Button>
        </SettingsSection>
      )}

      <SettingsSection
        title="Sesión"
        description="Cierra tu sesión en este dispositivo desde el menú de cuenta en la barra lateral."
        variant="payments"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Por seguridad, cierra sesión cuando uses un equipo compartido.
        </p>
      </SettingsSection>
    </SettingsTabShell>
  );
}
