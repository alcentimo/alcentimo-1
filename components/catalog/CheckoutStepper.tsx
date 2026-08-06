"use client";

import { Fragment } from "react";
import { cn } from "@/lib/cn";

export type CheckoutStep = 1 | 2 | 3 | 4;

const DEFAULT_LABELS = ["Carrito", "Datos", "Envío", "Pago"] as const;

interface CheckoutStepperProps {
  step: CheckoutStep;
  /** Cantidad de pasos visibles. Por defecto 4. */
  steps?: 2 | 4;
  labels?: string[];
  /** Permite volver a un paso ya completado (menor al actual). */
  onStepSelect?: (step: CheckoutStep) => void;
  className?: string;
}

export function CheckoutStepper({
  step,
  steps = 4,
  labels,
  onStepSelect,
  className,
}: CheckoutStepperProps) {
  const resolvedLabels =
    labels && labels.length >= steps
      ? labels.slice(0, steps)
      : DEFAULT_LABELS.slice(0, steps);

  return (
    <nav
      aria-label="Pasos del checkout"
      className={cn("checkout-stepper", className)}
    >
      <ol
        className={cn(
          "checkout-stepper-list",
          steps === 4 && "checkout-stepper-list--four",
        )}
      >
        {resolvedLabels.map((label, index) => {
          const stepNumber = (index + 1) as CheckoutStep;
          const isActive = step === stepNumber;
          const isDone = step > stepNumber;
          const canSelect = Boolean(onStepSelect) && stepNumber < step;

          return (
            <Fragment key={stepNumber}>
              {index > 0 ? (
                <li
                  className={cn(
                    "checkout-stepper-connector",
                    step >= stepNumber && "checkout-stepper-connector-done",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <li
                className={cn(
                  "checkout-stepper-item",
                  isActive && "checkout-stepper-item-active",
                  isDone && "checkout-stepper-item-done",
                  canSelect && "checkout-stepper-item-clickable",
                )}
              >
                {canSelect ? (
                  <button
                    type="button"
                    className="checkout-stepper-hit"
                    onClick={() => onStepSelect?.(stepNumber)}
                    aria-label={`Volver a ${label}`}
                  >
                    <span className="checkout-stepper-badge" aria-hidden="true">
                      ✓
                    </span>
                    <span className="checkout-stepper-label">{label}</span>
                  </button>
                ) : (
                  <>
                    <span className="checkout-stepper-badge" aria-hidden="true">
                      {isDone ? "✓" : stepNumber}
                    </span>
                    <span className="checkout-stepper-label">{label}</span>
                  </>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
