"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  changeCustomerPassword,
  saveCustomerProfile,
  CUSTOMER_MIN_PASSWORD_LENGTH,
} from "@/lib/customers/profile-actions";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { getStoreCatalogBasePath } from "@/lib/store-host";

interface CustomerProfilePanelProps {
  storeSlug: string;
  storeName: string;
  contactEmail: string | null;
  /** True si el cliente tiene login con contraseña (teléfono o email). */
  canChangePassword?: boolean;
  displayName: string | null;
  phone: string | null;
  deliveryAddress: string | null;
  whatsappPhone: string | null;
}

export function CustomerProfilePanel({
  storeSlug,
  storeName,
  contactEmail,
  canChangePassword = false,
  displayName,
  phone,
  deliveryAddress,
  whatsappPhone,
}: CustomerProfilePanelProps) {
  const router = useRouter();
  const [name, setName] = useState(displayName ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [addressValue, setAddressValue] = useState(deliveryAddress ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const whatsappHelpUrl = buildCustomerWhatsAppUrl(
    whatsappPhone,
    undefined,
    `Hola, necesito ayuda con mi cuenta en ${storeName}.`,
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSavePending(true);

    const result = await saveCustomerProfile({
      storeSlug,
      displayName: name,
      phone: phoneValue,
      deliveryAddress: addressValue,
    });

    setSavePending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess("Perfil actualizado.");
    router.refresh();
  }

  async function handleSignOut() {
    setError(null);
    setSignOutPending(true);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    setSignOutPending(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.push(getStoreCatalogBasePath(storeSlug));
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canChangePassword) {
      setError("Tu cuenta no usa contraseña.");
      return;
    }

    setError(null);
    setSuccess(null);
    setPasswordPending(true);

    const result = await changeCustomerPassword({
      storeSlug,
      currentPassword,
      newPassword,
      confirmPassword,
    });

    setPasswordPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Contraseña actualizada correctamente.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void handleSave(e)} className="card-panel space-y-4">
        <div>
          <label htmlFor="customer-name" className="label-field">
            Nombre
          </label>
          <input
            id="customer-name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="customer-phone" className="label-field">
            Teléfono
          </label>
          <input
            id="customer-phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            className="input-field"
            placeholder="04141234567"
          />
        </div>

        <div>
          <label htmlFor="customer-address" className="label-field">
            Dirección de entrega
          </label>
          <textarea
            id="customer-address"
            rows={3}
            maxLength={500}
            autoComplete="street-address"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            className="input-field min-h-[5rem] resize-y"
            placeholder="Urbanización, calle, referencia…"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Se usará para autocompletar tus próximos pedidos a domicilio.
          </p>
        </div>

        {contactEmail ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Correo de contacto: {contactEmail}
          </p>
        ) : phone ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Accedes con tu teléfono y contraseña.
          </p>
        ) : null}

        <button type="submit" disabled={savePending} className="btn-primary w-full">
          {savePending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      {canChangePassword ? (
        <form
          onSubmit={(e) => void handleChangePassword(e)}
          className="card-panel space-y-3"
        >
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Seguridad
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cambia tu contraseña usando la actual. Mínimo{" "}
            {CUSTOMER_MIN_PASSWORD_LENGTH} caracteres.
          </p>

          <div>
            <label htmlFor="current-password" className="label-field">
              Contraseña actual
            </label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              required
              value={currentPassword}
              disabled={passwordPending}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="new-password" className="label-field">
              Nueva contraseña
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
              value={newPassword}
              disabled={passwordPending}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="label-field">
              Confirmar nueva contraseña
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              disabled={passwordPending}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={passwordPending}
            className="btn-secondary w-full"
          >
            {passwordPending ? "Actualizando…" : "Cambiar contraseña"}
          </button>

          {whatsappHelpUrl ? (
            <a
              href={whatsappHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="customer-profile-whatsapp-link"
            >
              Ayuda por WhatsApp
            </a>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signOutPending}
        className="btn-secondary w-full"
      >
        {signOutPending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </div>
  );
}
