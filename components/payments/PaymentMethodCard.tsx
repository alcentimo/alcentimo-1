import type { ReactNode } from "react";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { PaymentMethodLogo } from "@/components/payments/PaymentMethodLogo";

export interface PaymentMethodCardProps {
  methodKey: PaymentMethodKey;
  description?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  action?: ReactNode;
  className?: string;
  logoClassName?: string;
}

export function PaymentMethodCard({
  methodKey,
  description,
  selectable = false,
  selected = false,
  onSelect,
  disabled = false,
  action,
  className = "",
  logoClassName = "h-11 w-11 shrink-0",
}: PaymentMethodCardProps) {
  const method = getPaymentMethod(methodKey);
  const isInteractive = selectable && !disabled;

  const baseClass = [
    "shipping-method-card relative flex items-start gap-3",
    selected ? "shipping-method-card-selected" : "",
    isInteractive ? "shipping-method-card-interactive" : "",
    disabled ? "opacity-60" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <PaymentMethodLogo methodKey={methodKey} className={logoClassName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {method.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description ?? method.description}
        </p>
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
      {selectable && selected && (
        <span
          className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-teal-600 ring-2 ring-teal-100 dark:ring-teal-900"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className={`${baseClass} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  return <article className={baseClass}>{content}</article>;
}
