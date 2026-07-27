import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CheckoutFieldKey } from "@/lib/catalog/checkout-validation";

interface CheckoutFieldGroupProps {
  field: CheckoutFieldKey;
  showError: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function CheckoutFieldGroup({
  field,
  showError,
  error,
  className,
  children,
}: CheckoutFieldGroupProps) {
  const messageId = error ? `checkout-error-${field}` : undefined;

  return (
    <div
      data-checkout-field={field}
      className={cn(
        "checkout-field-group",
        showError && error && "checkout-field-group--invalid",
        className,
      )}
    >
      {children}
      {showError && error ? (
        <p id={messageId} className="txn-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function checkoutInputClass(invalid: boolean, className?: string) {
  return cn("txn-input", invalid && "txn-input--invalid", className);
}

export function checkoutFileInputClass(invalid: boolean) {
  return cn("txn-file-input", invalid && "txn-file-input--invalid");
}
