"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";

interface CheckoutSuccessScreenProps {
  storeSlug: string;
  orderId: string;
  totalUsd: number;
  whatsappUrl?: string | null;
  /** Si el cliente adjuntó comprobante al confirmar. */
  hasPaymentProof?: boolean;
  wasGuest: boolean;
  onClose: () => void;
}

function formatOrderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export function CheckoutSuccessScreen({
  storeSlug,
  orderId,
  totalUsd,
  whatsappUrl = null,
  hasPaymentProof = false,
  wasGuest,
  onClose,
}: CheckoutSuccessScreenProps) {
  const { accountsEnabled } = useCustomerAccountMode();

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta");
  const registerBase = buildCustomerRegisterPath(storeSlug, accountPath);
  const fullRegisterPath = `${registerBase}${registerBase.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  const showAccountLink = wasGuest && accountsEnabled;
  const hasWhatsApp = Boolean(whatsappUrl?.trim());
  const orderRef = formatOrderRef(orderId);

  return (
    <div className="txn-checkout-success">
      <div className="txn-checkout-success-icon" aria-hidden="true">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        ¡Pedido registrado con éxito!
      </h3>

      <div className="txn-checkout-success-meta mt-4 w-full space-y-2 text-sm">
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Estado: <strong>En espera de verificación</strong>
        </p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Número de pedido:{" "}
          <strong className="tabular-nums text-zinc-900 dark:text-zinc-50">
            #{orderRef}
          </strong>
        </p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Total: <strong className="tabular-nums">{formatUsd(totalUsd)}</strong>
        </p>
      </div>

      <div className="mt-4 w-full rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-left text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        {hasPaymentProof ? (
          <>
            <p className="font-medium text-zinc-800 dark:text-zinc-100">
              Recibimos tu comprobante
            </p>
            <p className="mt-1">
              La tienda revisará el pago y te contactará para confirmar el
              despacho. Si quieres, también puedes avisarle por WhatsApp con el
              detalle del pedido.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-zinc-800 dark:text-zinc-100">
              Siguiente paso: confirmar el pago
            </p>
            <p className="mt-1">
              Tu pedido quedó guardado. Envía el comprobante de pago por
              WhatsApp (o escribe a la tienda) para que puedan verificarlo y
              preparar tu pedido.
            </p>
          </>
        )}
      </div>

      {hasWhatsApp ? (
        <a
          href={whatsappUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="txn-whatsapp-primary-btn mt-6 inline-flex w-full items-center justify-center gap-2"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Enviar comprobante / Contactar por WhatsApp</span>
        </a>
      ) : (
        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          La tienda aún no tiene WhatsApp configurado. Conserva tu número de
          pedido <strong>#{orderRef}</strong> para el seguimiento.
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className={
          hasWhatsApp
            ? "txn-whatsapp-outline-btn mt-4 w-full"
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
