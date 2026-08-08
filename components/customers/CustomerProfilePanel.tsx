"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  changeCustomerPassword,
  saveCustomerProfile,
  CUSTOMER_MIN_PASSWORD_LENGTH,
} from "@/lib/customers/profile-actions";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import type { CustomerAuthMethod } from "@/lib/customers/phone-auth";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";

interface CustomerProfilePanelProps {
  storeSlug: string;
  storeName: string;
  contactEmail: string | null;
  loginMethod?: CustomerAuthMethod;
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
  loginMethod = "phone",
  canChangePassword = false,
  displayName,
  phone,
  deliveryAddress,
  whatsappPhone,
}: CustomerProfilePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const customerSession = useCustomerSessionOptional();
  const [name, setName] = useState(displayName ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [emailValue, setEmailValue] = useState(contactEmail ?? "");
  const [addressValue, setAddressValue] = useState(deliveryAddress ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName ?? "");
    setPhoneValue(phone ?? "");
    setEmailValue(contactEmail ?? "");
    setAddressValue(deliveryAddress ?? "");
  }, [displayName, phone, contactEmail, deliveryAddress]);

  const phoneRequired = loginMethod === "phone";
  const canEditContactEmail = loginMethod === "phone";
  const loginLabel =
    loginMethod === "email"
      ? contactEmail
        ? `Accedes con correo: ${contactEmail}`
        : "Accedes con tu correo y contraseña."
      : phone
        ? `Accedes con teléfono: ${phone}`
        : "Accedes con tu teléfono y contraseña.";

  const whatsappHelpUrl = buildCustomerWhatsAppUrl(
    whatsappPhone,
    undefined,
    `Hola, necesito ayuda con mi cuenta en ${storeName}.`,
  );
  const pathOptions = { pathname };
  const ordersPath = getStoreCustomerAccountPath(
    storeSlug,
    "cuenta",
    pathOptions,
  );
  const catalogPath = getStoreCatalogBasePath(storeSlug, pathOptions);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSavePending(true);

    const result = await saveCustomerProfile({
      storeSlug,
      displayName: name,
      phone: phoneValue,
      contactEmail: canEditContactEmail ? emailValue : undefined,
      deliveryAddress: addressValue,
      requirePhone: phoneRequired,
    });

    setSavePending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName(result.displayName);
    setPhoneValue(result.phone ?? "");
    setEmailValue(result.contactEmail ?? "");
    setAddressValue(result.deliveryAddress ?? "");

    // Actualiza la sesión del catálogo de inmediato para el autofill del checkout.
    customerSession?.setSessionFromRegistration(
      {
        displayName: result.displayName,
        phone: result.phone,
        contactEmail: result.contactEmail,
        userId: customerSession.userId,
      },
      { refresh: false },
    );
    await customerSession?.refreshSession();

    setSuccess("Perfil actualizado. Tus datos se usarán al finalizar el pedido.");
    router.refresh();
  }

  async function handleSignOut() {
    setError(null);
    setSignOutPending(true);

    if (customerSession) {
      try {
        await customerSession.signOut();
        router.push(catalogPath);
        return;
      } catch {
        // fallback abajo
      }
    }

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    setSignOutPending(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.push(catalogPath);
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
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Datos de contacto
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {loginLabel} Estos datos se autocompletan en el checkout.
          </p>
        </div>

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
            Teléfono / WhatsApp{" "}
            {!phoneRequired ? (
              <span className="font-normal text-zinc-400">(opcional)</span>
            ) : null}
          </label>
          <input
            id="customer-phone"
            type="tel"
            required={phoneRequired}
            inputMode="tel"
            autoComplete="tel"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            className="input-field"
            placeholder="0412… o 412…"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Lo usamos para coordinar tu pedido y autocompletar el pago.
          </p>
        </div>

        {loginMethod === "email" ? (
          <div>
            <label htmlFor="customer-email" className="label-field">
              Correo de acceso
            </label>
            <input
              id="customer-email"
              type="email"
              value={contactEmail ?? ""}
              disabled
              className="input-field opacity-80"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Este correo es tu usuario de acceso. No se puede cambiar aquí.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="customer-contact-email" className="label-field">
              Correo electrónico{" "}
              <span className="font-normal text-zinc-400">(opcional)</span>
            </label>
            <input
              id="customer-contact-email"
              type="email"
              autoComplete="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Opcional, sin verificación. Sirve como respaldo de contacto.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="customer-address" className="label-field">
            Dirección de entrega{" "}
            <span className="font-normal text-zinc-400">(opcional)</span>
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

        <button type="submit" disabled={savePending} className="btn-primary w-full">
          {savePending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <section className="card-panel space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Seguridad
        </h2>
        {canChangePassword ? (
          <form
            onSubmit={(e) => void handleChangePassword(e)}
            className="space-y-3"
          >
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
          </form>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Esta cuenta inicia sesión con un proveedor externo (por ejemplo
            Google), por lo que el cambio de contraseña no aplica aquí.
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
      </section>

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

      <div className="space-y-3">
        <Link href={ordersPath} className="btn-secondary flex w-full justify-center">
          Ver mis compras
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signOutPending || customerSession?.signOutPending}
          className="btn-secondary w-full"
        >
          {signOutPending || customerSession?.signOutPending
            ? "Cerrando sesión…"
            : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}
