"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function CatalogMoneyInput({
  prefix,
  suffix,
  value,
  disabled,
  onChange,
  onBlur,
  className,
  "aria-label": ariaLabel,
}: {
  prefix?: string;
  suffix?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className ?? "w-full")}>
      {prefix ? (
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-zinc-400">
          {prefix}
        </span>
      ) : null}
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-zinc-400">
          {suffix}
        </span>
      ) : null}
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={cn("h-9 text-sm tabular-nums", prefix && "pl-6", suffix && "pr-7")}
        placeholder="—"
      />
    </div>
  );
}
