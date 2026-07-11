import type { ReactNode } from "react";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import {
  getShippingMethod,
  type ShippingMethodDefinition,
} from "@/src/config/shipping-methods";
import { ShippingCarrierLogo } from "@/components/shipping/ShippingCarrierLogo";

export interface ShippingMethodCardProps {
  carrierKey: ShippingCarrierKey;
  /** Sustituye la descripción del catálogo central. */
  description?: string;
  /** Texto adicional (p. ej. detalles de delivery configurados por la tienda). */
  details?: string;
  /** Tiempo estimado; por defecto viene del catálogo central. */
  estimatedTime?: string;
  /** Modo selección (checkout). */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** Acción lateral (p. ej. switch en ajustes). */
  action?: ReactNode;
  className?: string;
}

function resolveCopy(
  carrierKey: ShippingCarrierKey,
  description?: string,
  estimatedTime?: string,
): Pick<ShippingMethodDefinition, "label" | "description" | "estimatedTime"> {
  const method = getShippingMethod(carrierKey);
  return {
    label: method.label,
    description: description ?? method.description,
    estimatedTime: estimatedTime ?? method.estimatedTime,
  };
}

export function ShippingMethodCard({
  carrierKey,
  description,
  details,
  estimatedTime,
  selectable = false,
  selected = false,
  onSelect,
  disabled = false,
  action,
  className = "",
}: ShippingMethodCardProps) {
  const copy = resolveCopy(carrierKey, description, estimatedTime);
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
      <ShippingCarrierLogo carrierKey={carrierKey} className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {copy.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {details ?? copy.description}
        </p>
        {copy.estimatedTime && (
          <p className="mt-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
            {copy.estimatedTime}
          </p>
        )}
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
