"use client";

import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import {
  getSalesStatusSelectClass,
  SALES_STATUS_OPTIONS,
} from "@/lib/inbox/sales-status";

interface SalesStatusSelectProps {
  value: InboxSalesStatus;
  disabled?: boolean;
  onChange: (status: InboxSalesStatus) => void;
}

export function SalesStatusSelect({
  value,
  disabled = false,
  onChange,
}: SalesStatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as InboxSalesStatus)}
      className={`${getSalesStatusSelectClass(value)} mt-2 w-full`}
      aria-label="Estado del cliente"
    >
      {SALES_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
