"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";
import { cn } from "@/lib/cn";

interface CheckoutSuccessScreenProps {
  storeSlug: string;
  orderId: string;
  totalUsd: number;
  whatsappUrl?: string | null;
  whatsappOpened: boolean;
  wasGuest: boolean;
  onClose: () => void;
}

export function CheckoutSuccessScreen({
  storeSlug,
  orderId,
  totalUsd,
  whatsappUrl = null,
  whatsappOpened,
  wasGuest,
  onClose,
}: CheckoutSuccessScreenProps) {
  const { accountsEnabled } = useCustomerAccountMode();
  const autoOpenAttempted = useRef(false);

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta");
  const registerBase = buildCustomerRegisterPath(storeSlug, accountPath);
  const fullRegisterPath = `${registerBase}${registerBase.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  const showAccountLink = wasGuest && accountsEnabled;

  // Si el popup del submit falló, intenta abrir WhatsApp una vez al mostrar el éxito.
  useEffect(() => {
    if (!whatsappUrl || whatsappOpened || autoOpenAttempted.current) return;
    autoOpenAttempted.current = true;
    const timer = window.setTimeout(() => {
      try {
        const opened = window.open(whatsappUrl, "alcentimo-wa-checkout");
        if (!opened) {
          // Popup bloqueado: el botón verde principal es el respaldo.
        }
      } catch {
        // ignore
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [whatsappUrl, whatsappOpened]);

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
        {whatsappUrl
          ? whatsappOpened
            ? "Tu pedido ya está en la tienda. Completa el envío por WhatsApp para que el comercio lo reciba."
            : "Tu pedido ya está guardado. Ábrelo en WhatsApp para enviárselo al comercio."
          : "Tu pedido quedó registrado. La tienda lo revisará y te contactará si hace falta."}
      </p>

      {whatsappUrl ? (
        <ol className="txn-checkout-success-steps mt-4 w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <li>1. Envía el mensaje prearmado por WhatsApp.</li>
          <li>2. Espera la confirmación de la tienda.</li>
          <li>3. Listo: puedes seguir comprando cuando quieras.</li>
        </ol>
      ) : null}

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "txn-whatsapp-primary-btn mt-6 inline-flex w-full items-center justify-center gap-2",
          )}
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            {whatsappOpened
              ? "Abrir de nuevo en WhatsApp 📲"
              : "Enviar/Abrir pedido en WhatsApp 📲"}
          </span>
        </a>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className={
          whatsappUrl
            ? "txn-whatsapp-outline-btn mt-3 w-full"
            : "txn-submit-btn mt-6"
        }
      >
        Seguir comprando
      </button>

      {showAccountLink ? (
        <Link
          href={fullRegisterPath}
          className="mt-4 text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Crear cuenta (opcional)
        </Link>
      ) : null}
    </div>
  );
}
