"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, LogOut, MessageCircle, ShoppingBag, UserPlus, UserRound } from "lucide-react";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { getStoreCatalogBasePath, getStoreCustomerAccountPath } from "@/lib/store-host";
import type { LocationHoursSettings } from "@/lib/store-settings/types";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";

interface CatalogStoreProfileSheetProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeDescription?: string | null;
  whatsappPhone?: string | null;
  locationHours?: LocationHoursSettings | null;
}

function StoreAvatar({
  storeName,
  storeLogoUrl,
}: {
  storeName: string;
  storeLogoUrl: string | null;
}) {
  if (storeLogoUrl) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
        <Image
          src={storeLogoUrl}
          alt={storeName}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xl font-bold text-zinc-800 shadow-sm">
      {storeName.charAt(0).toUpperCase()}
    </div>
  );
}

export function CatalogStoreProfileSheet({
  storeSlug,
  storeName,
  storeLogoUrl,
  storeDescription = null,
  whatsappPhone = null,
  locationHours = null,
}: CatalogStoreProfileSheetProps) {
  const shellNav = useCatalogShellNavigationOptional();
  const customerSession = useCustomerSessionOptional();
  const { accountsEnabled } = useCustomerAccountMode();
  const open = shellNav?.profileOpen ?? false;
  const onClose = () => shellNav?.closeProfile();

  if (!shellNav) return null;

  const isCustomer = customerSession?.isCustomer ?? false;
  const displayName = customerSession?.displayName?.trim() ?? "";
  const phone = customerSession?.phone?.trim() ?? "";
  const contactEmail = customerSession?.contactEmail?.trim() ?? "";
  const accountIdentity = phone || contactEmail;

  const whatsappUrl = whatsappPhone?.trim()
    ? buildWhatsAppOrderUrl(
        whatsappPhone.trim(),
        `Hola ${storeName}, tengo una consulta.`,
      )
    : null;

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta");
  const profilePath = getStoreCustomerAccountPath(storeSlug, "perfil");

  async function handleSignOut() {
    if (!customerSession) return;
    await customerSession.signOut();
    onClose();
  }

  return open ? (
    <div className="txn-cart-overlay" role="presentation">
      <button
        type="button"
        className="txn-cart-backdrop"
        aria-label="Cerrar perfil de la tienda"
        onClick={onClose}
      />
      <aside
        className="txn-checkout catalog-profile-sheet"
        aria-labelledby="catalog-profile-title"
      >
        <header className="txn-checkout-header">
          <div className="flex min-w-0 items-center gap-3">
            <StoreAvatar storeName={storeName} storeLogoUrl={storeLogoUrl} />
            <div className="min-w-0">
              <h2 id="catalog-profile-title" className="txn-checkout-title">
                {storeName}
              </h2>
              <p className="txn-checkout-subtitle">Información de la tienda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="catalog-profile-close"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="txn-checkout-scroll catalog-profile-body">
          {locationHours ? (
            <div className="catalog-profile-section">
              <StoreOpenBadge locationHours={locationHours} />
            </div>
          ) : null}

          {storeDescription?.trim() ? (
            <div className="catalog-profile-section">
              <p className="catalog-profile-text">{storeDescription.trim()}</p>
            </div>
          ) : null}

          {locationHours?.address?.trim() || locationHours?.city?.trim() ? (
            <div className="catalog-profile-section">
              <h3 className="catalog-profile-label">Ubicación</h3>
              <p className="catalog-profile-text">
                {[locationHours?.address, locationHours?.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          ) : null}

          {whatsappUrl ? (
            <div className="catalog-profile-section">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="catalog-profile-whatsapp-btn"
              >
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                Escribir por WhatsApp
              </a>
            </div>
          ) : null}

          <div className="catalog-profile-section catalog-profile-account">
            <h3 className="catalog-profile-label">
              <UserRound className="inline h-4 w-4" aria-hidden="true" /> Tu cuenta
            </h3>

            {isCustomer && displayName ? (
              <div className="catalog-profile-customer-card">
                <p className="catalog-profile-customer-name">{displayName}</p>
                {accountIdentity ? (
                  <p className="catalog-profile-customer-phone">{accountIdentity}</p>
                ) : null}
                <p className="catalog-profile-customer-hint">
                  Sesión activa en {storeName}
                </p>
              </div>
            ) : (
              <p className="catalog-profile-text">
                {accountsEnabled
                  ? `Puedes comprar como invitado. Si quieres, crea una cuenta con teléfono y contraseña para guardar tus datos en ${storeName}.`
                  : `Compra como invitado en ${storeName}: solo necesitas tus datos de contacto al pagar.`}
              </p>
            )}

            {isCustomer ? (
              <>
                <Link
                  href={accountPath}
                  className="catalog-profile-link-btn"
                  onClick={onClose}
                >
                  <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Ver mis compras
                </Link>
                <Link
                  href={profilePath}
                  className="catalog-profile-link-btn catalog-profile-link-btn-secondary"
                  onClick={onClose}
                >
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Mi perfil
                </Link>
                <button
                  type="button"
                  className="catalog-profile-link-btn catalog-profile-link-btn-secondary"
                  onClick={() => void handleSignOut()}
                  disabled={customerSession?.signOutPending}
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {customerSession?.signOutPending
                    ? "Cerrando sesión…"
                    : "Cerrar sesión"}
                </button>
              </>
            ) : accountsEnabled ? (
              <div className="catalog-profile-auth-actions">
                <button
                  type="button"
                  className="catalog-profile-link-btn catalog-profile-link-btn-primary"
                  onClick={() => {
                    onClose();
                    shellNav.openRegister("register");
                  }}
                >
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Crear cuenta
                </button>
                <button
                  type="button"
                  className="catalog-profile-link-btn catalog-profile-link-btn-secondary"
                  onClick={() => {
                    onClose();
                    shellNav.openRegister("login");
                  }}
                >
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Iniciar sesión
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="catalog-profile-footer">
          <Link
            href={getStoreCatalogBasePath(storeSlug)}
            className="catalog-profile-footer-link"
            onClick={onClose}
          >
            Volver al catálogo
          </Link>
        </footer>
      </aside>
    </div>
  ) : null;
}
