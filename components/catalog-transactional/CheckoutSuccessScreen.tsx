"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, Upload } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import { getStoreCustomerAccountPath } from "@/lib/store-host";
import { useCustomerAccountMode } from "@/components/catalog-transactional/CustomerAccountModeContext";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";
import { attachOrderPaymentProof } from "@/lib/orders/actions";
import { checkoutFileInputClass } from "@/components/catalog-transactional/CheckoutFieldFeedback";

interface CheckoutSuccessScreenProps {
  storeSlug: string;
  orderId: string;
  totalUsd: number;
  whatsappUrl?: string | null;
  /** Si el cliente adjuntó comprobante al confirmar. */
  hasPaymentProof?: boolean;
  /**
   * Si el método de pago del pedido admite/espera comprobante
   * (Pago Móvil, transferencia, etc.). False en efectivo / contra entrega.
   */
  expectsPaymentProof?: boolean;
  /** True solo si el pedido se hizo sin sesión de cliente. */
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
  expectsPaymentProof = true,
  wasGuest,
  onClose,
}: CheckoutSuccessScreenProps) {
  const pathname = usePathname();
  const { accountsEnabled } = useCustomerAccountMode();
  const customerSession = useCustomerSessionOptional();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofAttached, setProofAttached] = useState(hasPaymentProof);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  const accountPath = getStoreCustomerAccountPath(storeSlug, "cuenta", {
    pathname,
  });
  const registerBase = buildCustomerRegisterPath(storeSlug, accountPath);
  const fullRegisterPath = `${registerBase}${registerBase.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  const hasActiveSession = Boolean(
    customerSession?.isAuthenticated || customerSession?.isCustomer,
  );
  // Solo invitados: oculta “Crear cuenta” si ya hay sesión en la tienda.
  const showAccountLink = wasGuest && !hasActiveSession && accountsEnabled;
  const hasWhatsApp = Boolean(whatsappUrl?.trim());
  const orderRef = formatOrderRef(orderId);
  const showProofUpload = expectsPaymentProof && !proofAttached;

  const instructions = (() => {
    if (proofAttached) {
      return {
        title: "Tu pago está siendo verificado",
        body: "La tienda ya recibió tu comprobante y está revisando el pago. Conserva el número de pedido; te contactarán para confirmar el despacho.",
        whatsappLabel: "Avisar a la tienda por WhatsApp",
      };
    }
    if (expectsPaymentProof) {
      return {
        title: "Falta enviar tu comprobante",
        body: hasWhatsApp
          ? "Tu pedido quedó registrado, pero aún no hay comprobante. Súbelo aquí o envíalo por WhatsApp para completar la verificación y que puedan preparar tu pedido."
          : "Tu pedido quedó registrado, pero aún no hay comprobante. Súbelo aquí o contacta a la tienda e indica el número de pedido para completar la verificación.",
        whatsappLabel: "Enviar comprobante por WhatsApp",
      };
    }
    return {
      title: "Pedido en revisión de la tienda",
      body: "Con este método de pago no hace falta comprobante. El pago se confirma al entregar o en el local. La tienda te contactará para coordinar.",
      whatsappLabel: "Escribir a la tienda por WhatsApp",
    };
  })();

  function handleProofSelected(file: File | null) {
    setUploadError(null);
    if (!file) return;

    startUploadTransition(async () => {
      const result = await attachOrderPaymentProof({
        storeSlug,
        orderId,
        proof: file,
      });

      if (!result.ok) {
        setUploadError(result.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setProofAttached(true);
    });
  }

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
        <p className="font-medium text-zinc-800 dark:text-zinc-100">
          {instructions.title}
        </p>
        <p className="mt-1">{instructions.body}</p>

        {showProofUpload ? (
          <div className="mt-3 space-y-2">
            <label className="txn-field !mb-0">
              <span className="sr-only">Subir comprobante de pago</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isUploading}
                onChange={(event) => {
                  handleProofSelected(event.target.files?.[0] ?? null);
                }}
                aria-invalid={Boolean(uploadError)}
                aria-describedby={
                  uploadError
                    ? "checkout-success-proof-error"
                    : "checkout-success-proof-hint"
                }
                className={checkoutFileInputClass(Boolean(uploadError))}
              />
            </label>
            <p
              id="checkout-success-proof-hint"
              className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400"
            >
              <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {isUploading
                  ? "Subiendo comprobante…"
                  : "JPG, PNG, WebP o GIF. Máx. 5 MB."}
              </span>
            </p>
            {uploadError ? (
              <p
                id="checkout-success-proof-error"
                className="text-[11px] font-medium text-red-600 dark:text-red-400"
                role="alert"
              >
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasWhatsApp ? (
        <a
          href={whatsappUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="txn-whatsapp-primary-btn mt-6 inline-flex w-full items-center justify-center gap-2"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{instructions.whatsappLabel}</span>
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
