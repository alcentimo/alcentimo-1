"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { CheckoutQuickAuth } from "@/components/catalog-transactional/CheckoutQuickAuth";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";
import { getAuthCallbackUrl } from "@/lib/site-url";
import {
  getStoreCustomerAccountPath,
} from "@/lib/store-host";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta");

  async function handleGoogleAuth() {
    setGoogleError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const redirectTo = getAuthCallbackUrl(accountPath, {
      store: storeSlug,
      orderId,
    });

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setGoogleLoading(false);
      setGoogleError(oauthError.message);
    }
  }

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
          <li>3. Opcional: guarda tus datos abajo para la próxima compra.</li>
        </ol>
      ) : null}

      {wasGuest && !savedAccount ? (
        <div className="txn-checkout-success-save mt-6 w-full text-left">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            ¿Quieres guardar tus datos? (opcional)
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Sin contraseña: confirma tu WhatsApp y la próxima vez autocompletamos
            todo. Tu pedido aparecerá en <strong>Mi cuenta</strong>.
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

          <button
            type="button"
            onClick={() => void handleGoogleAuth()}
            disabled={googleLoading}
            className="txn-google-auth-btn"
          >
            <GoogleIcon />
            {googleLoading ? "Redirigiendo a Google…" : "Continuar con Google"}
          </button>

          {googleError ? (
            <p className="txn-checkout-error mt-2" role="alert">
              {googleError}
            </p>
          ) : null}
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
        {wasGuest && !savedAccount ? "Ahora no, seguir comprando" : "Seguir comprando"}
      </button>

      {wasGuest && !savedAccount ? (
        <Link
          href={`/register?store=${encodeURIComponent(storeSlug)}&next=${encodeURIComponent(accountPath)}&orderId=${encodeURIComponent(orderId)}`}
          className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Crear cuenta con más opciones
        </Link>
      ) : null}
    </div>
  );
}
