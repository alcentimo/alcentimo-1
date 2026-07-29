"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { CheckoutQuickAuth } from "@/components/catalog-transactional/CheckoutQuickAuth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { formatUsd } from "@/lib/format";
import {
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";

interface CheckoutSuccessScreenProps {
  storeSlug: string;
  orderId: string;
  totalUsd: number;
  whatsappOpened: boolean;
  wasGuest: boolean;
  customerName: string;
  customerPhone: string;
  onClose: () => void;
}

export function CheckoutSuccessScreen({
  storeSlug,
  orderId,
  totalUsd,
  whatsappOpened,
  wasGuest,
  customerName,
  customerPhone,
  onClose,
}: CheckoutSuccessScreenProps) {
  const [savedAccount, setSavedAccount] = useState(false);
  const { accountsEnabled } = useCustomerAccountMode();

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta");
  const registerBase = buildCustomerRegisterPath(storeSlug, accountPath);
  const fullRegisterPath = `${registerBase}${registerBase.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  const offerAccount = wasGuest && !savedAccount && accountsEnabled;

  return (
    <div className="txn-checkout-success">
      <div className="txn-checkout-success-icon" aria-hidden="true">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        ¡Pedido confirmado!
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Referencia <strong>#{orderId.slice(0, 8).toUpperCase()}</strong> ·{" "}
        {formatUsd(totalUsd)}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {whatsappOpened
          ? "Tu pedido ya está en la tienda. Te abrimos WhatsApp para que envíes el comprobante y confirmes con el comercio."
          : "Tu pedido quedó registrado. La tienda lo revisará y te contactará si hace falta."}
      </p>

      {whatsappOpened ? (
        <ol className="txn-checkout-success-steps mt-4 w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <li>1. Envía el comprobante por WhatsApp.</li>
          <li>2. Espera la confirmación de la tienda.</li>
          {accountsEnabled ? (
            <li>3. Opcional: guarda tus datos abajo para la próxima compra.</li>
          ) : (
            <li>3. Listo: puedes seguir comprando cuando quieras.</li>
          )}
        </ol>
      ) : null}

      {offerAccount ? (
        <div className="txn-checkout-success-save mt-6 w-full text-left">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            ¿Quieres crear una cuenta? (opcional)
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Tu pedido ya está listo. Si quieres, guarda teléfono y contraseña para
            la próxima compra — sin SMS. También puedes continuar sin cuenta.
          </p>

          <CheckoutQuickAuth
            variant="postPurchase"
            storeSlug={storeSlug}
            orderId={orderId}
            initialDisplayName={customerName}
            initialPhone={customerPhone}
            onAuthenticated={() => setSavedAccount(true)}
          />

          <div className="txn-checkout-success-divider">
            <span>o</span>
          </div>

          <GoogleSignInButton
            postAuthPath={accountPath}
            storeSlug={storeSlug}
            orderId={orderId}
            buttonClassName="txn-google-auth-btn pointer-events-none border-0 bg-transparent shadow-none"
          />
        </div>
      ) : null}

      {savedAccount ? (
        <div className="txn-checkout-success-saved mt-6 w-full rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="font-medium">Datos guardados.</p>
          <p className="mt-1 text-xs opacity-90">
            Tu pedido ya está en{" "}
            <Link href={accountPath} className="font-semibold underline">
              Mis compras
            </Link>
            .
          </p>
        </div>
      ) : null}

      <button type="button" onClick={onClose} className="txn-submit-btn mt-6">
        {offerAccount ? "Ahora no, seguir comprando" : "Seguir comprando"}
      </button>

      {offerAccount ? (
        <Link
          href={fullRegisterPath}
          className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Crear cuenta con más opciones
        </Link>
      ) : null}
    </div>
  );
}
