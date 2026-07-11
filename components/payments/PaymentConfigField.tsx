"use client";

import type { PaymentMethodFieldDefinition } from "@/src/config/payment-methods";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { validateSinglePaymentField } from "@/lib/payments/validate-payment-fields";

interface PaymentConfigFieldProps {
  methodKey: PaymentMethodKey;
  field: PaymentMethodFieldDefinition;
  enabled: boolean;
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onBlurValidate?: (error: string | null) => void;
}

export function PaymentConfigField({
  methodKey,
  field,
  enabled,
  value,
  error,
  onChange,
  onBlurValidate,
}: PaymentConfigFieldProps) {
  const inputId = `pay-${methodKey}-${field.key}`;
  const inputType = field.key === "email" ? "email" : "text";

  function handleBlur() {
    if (!onBlurValidate) return;
    const validationError = validateSinglePaymentField(
      methodKey,
      field.key,
      value,
      enabled,
    );
    onBlurValidate(validationError);
  }

  return (
    <div className={field.fullWidth ? "sm:col-span-2" : ""}>
      <label className="label-field" htmlFor={inputId}>
        {field.label}
        {!field.optional && (
          <span className="ml-1 font-normal text-zinc-400">*</span>
        )}
      </label>
      <input
        id={inputId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={field.placeholder}
        className={`input-field mt-2 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
