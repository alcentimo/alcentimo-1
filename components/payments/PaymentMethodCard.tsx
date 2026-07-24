import type { ReactNode } from "react";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { PaymentMethodLogo } from "@/components/payments/PaymentMethodLogo";
import { cn } from "@/lib/cn";

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
  variant?: "default" | "settings";
  muted?: boolean;
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
  logoClassName = "h-7 w-7",
  variant = "default",
  muted = false,
}: PaymentMethodCardProps) {
  const method = getPaymentMethod(methodKey);
  const isInteractive = selectable && !disabled;
  const isSettings = variant === "settings";

  const baseClass = [
    isSettings
      ? "payment-method-card-header flex items-center gap-3"
      : "shipping-method-card relative flex items-start gap-3",
    !isSettings && selected ? "shipping-method-card-selected" : "",
    !isSettings && isInteractive ? "shipping-method-card-interactive" : "",
    disabled ? "opacity-60" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span
        className={
          isSettings
            ? "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
            : "shrink-0"
        }
      >
        <PaymentMethodLogo methodKey={methodKey} className={logoClassName} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={
            isSettings
              ? cn(
                  "text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
                  muted && "text-zinc-500 dark:text-zinc-400",
                )
              : "truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          }
        >
          {method.label}
        </p>
        <p
          className={
            isSettings
              ? cn(
                  "mt-0.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400",
                  muted && "text-zinc-400 dark:text-zinc-500",
                )
              : "mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
          }
        >
          {description ?? method.description}
        </p>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {!isSettings && selectable && selected && (
        <span
          className="shipping-method-card-dot absolute right-3 top-3 h-2.5 w-2.5 rounded-full ring-2"
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

  return <div className={baseClass}>{content}</div>;
}
