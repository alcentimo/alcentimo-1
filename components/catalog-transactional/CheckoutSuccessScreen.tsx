"use client";

import { CheckCircle2 } from "lucide-react";
import { formatUsd } from "@/lib/format";

interface CheckoutSuccessScreenProps {
  orderId: string;
  totalUsd: number;
  whatsappOpened: boolean;
  onClose: () => void;
}

export function CheckoutSuccessScreen({
  orderId,
  totalUsd,
  whatsappOpened,
  onClose,
}: CheckoutSuccessScreenProps) {
  return (
    <div className="txn-checkout-success">
      <div className="txn-checkout-success-icon" aria-hidden="true">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        ¡Pedido registrado!
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Referencia <strong>#{orderId.slice(0, 8).toUpperCase()}</strong> ·{" "}
        {formatUsd(totalUsd)}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {whatsappOpened
          ? "Te abrimos WhatsApp para confirmar el pago con la tienda."
          : "La tienda recibirá tu pedido en su panel."}
      </p>
      <button type="button" onClick={onClose} className="txn-submit-btn mt-6">
        Seguir comprando
      </button>
    </div>
  );
}
