"use client";

import { CustomerRegisterPanel } from "@/components/customers/CustomerRegisterPanel";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";

interface CatalogCustomerRegisterSheetProps {
  storeSlug: string;
  storeName: string;
  orderId?: string | null;
}

export function CatalogCustomerRegisterSheet({
  storeSlug,
  storeName,
  orderId = null,
}: CatalogCustomerRegisterSheetProps) {
  const shellNav = useCatalogShellNavigationOptional();
  const customerSession = useCustomerSessionOptional();
  const open = shellNav?.registerOpen ?? false;
  const onClose = () => shellNav?.closeRegister();

  if (!shellNav) return null;

  const nextPath = getStoreCustomerAccountPath(storeSlug, "cuenta");

  return open ? (
    <div className="txn-cart-overlay" role="presentation">
      <button
        type="button"
        className="txn-cart-backdrop"
        aria-label="Cerrar registro"
        onClick={onClose}
      />
      <aside
        className="txn-checkout catalog-register-sheet"
        aria-labelledby="catalog-register-title"
      >
        <header className="txn-checkout-header">
          <div className="min-w-0">
            <h2 id="catalog-register-title" className="txn-checkout-title">
              Crear cuenta
            </h2>
            <p className="txn-checkout-subtitle">
              Regístrate en {storeName} para guardar tus datos y ver tus pedidos.
            </p>
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

        <div className="txn-checkout-scroll catalog-register-body">
          <CustomerRegisterPanel
            storeSlug={storeSlug}
            storeName={storeName}
            nextPath={nextPath}
            orderId={orderId}
            variant="catalog"
            onCancel={onClose}
            redirectOnSuccess={false}
            onRegistered={(profile) => {
              customerSession?.setSessionFromRegistration(profile);
              void customerSession?.refreshSession();
              onClose();
              shellNav.openProfile();
            }}
          />
        </div>
      </aside>
    </div>
  ) : null;
}
