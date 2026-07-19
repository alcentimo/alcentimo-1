"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveCustomerProfile } from "@/lib/customers/profile-actions";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";

interface CustomerProfilePanelProps {
  storeSlug: string;
  storeName: string;
  contactEmail: string | null;
  displayName: string | null;
  phone: string | null;
  whatsappPhone: string | null;
}

export function CustomerProfilePanel({
  storeSlug,
  storeName,
  contactEmail,
  displayName,
  phone,
  whatsappPhone,
}: CustomerProfilePanelProps) {
  const router = useRouter();
  const [name, setName] = useState(displayName ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [savePending, setSavePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const whatsappHelpUrl = buildCustomerWhatsAppUrl(
    whatsappPhone,
    undefined,
    `Hola, necesito ayuda para cambiar mi contraseña en ${storeName}.`,
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

  async function handlePasswordReset() {
    if (!contactEmail) {
      setError(
        "Tu cuenta usa teléfono. Contacta a la tienda por WhatsApp para restablecer el acceso.",
      );
      return;
    }

    setError(null);
    setPasswordPending(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      contactEmail,
      { redirectTo: getPasswordResetRedirectUrl() },
    );

    setPasswordPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(
      `Te enviamos un enlace a ${contactEmail} para cambiar tu contraseña.`,
    );
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

        {contactEmail ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Correo de acceso: {contactEmail}
          </p>
        ) : null}

        <button type="submit" disabled={savePending} className="btn-primary w-full">
          {savePending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <div className="card-panel space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Seguridad
        </h2>
        <button
          type="button"
          onClick={() => void handlePasswordReset()}
          disabled={passwordPending || !contactEmail}
          className="btn-secondary w-full"
        >
          {passwordPending ? "Enviando enlace…" : "Cambiar contraseña"}
        </button>
        {!contactEmail ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Si iniciaste sesión con teléfono, usa WhatsApp para pedir ayuda con tu
            acceso.
          </p>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Te enviaremos un enlace por correo para crear una nueva contraseña.
          </p>
        )}
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
        {contactEmail ? (
          <Link
            href={`/dashboard/recuperar-contrasena?email=${encodeURIComponent(contactEmail)}`}
            className="block text-center text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ¿No recibiste el correo? Recuperar contraseña
          </Link>
        ) : null}
      </div>

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
