"use client";

import type { PaymentMethodFieldDefinition } from "@/src/config/payment-methods";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { validateSinglePaymentField } from "@/lib/payments/validate-payment-fields";
import { getVenezuelaBankOptions } from "@/src/config/venezuela-banks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

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
  const hasError = Boolean(error);
  const errorClassName = hasError
    ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-100"
    : "";

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

  function handleSelectBlur() {
    handleBlur();
  }

  return (
    <div className={field.fullWidth ? "sm:col-span-2" : ""}>
      <Label htmlFor={inputId} className="payment-field-label">
        {field.label}
        {!field.optional && (
          <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">*</span>
        )}
      </Label>

      {field.type === "bank-select" ? (
        <Select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleSelectBlur}
          className={cn("mt-2 h-10", errorClassName)}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : undefined}
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {getVenezuelaBankOptions(value).map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={inputId}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          className={cn("mt-2 h-10", errorClassName)}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      )}

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
