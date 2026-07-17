"use client";

import { cn } from "@/lib/cn";

export type CheckoutStep = 1 | 2;

interface CheckoutStepperProps {
  step: CheckoutStep;
  step1Label?: string;
  step2Label?: string;
  className?: string;
}

export function CheckoutStepper({
  step,
  step1Label = "Productos y envío",
  step2Label = "Pago y datos",
  className,
}: CheckoutStepperProps) {
  return (
    <nav
      aria-label="Pasos del checkout"
      className={cn("checkout-stepper", className)}
    >
      <ol className="checkout-stepper-list">
        <li
          className={cn(
            "checkout-stepper-item",
            step === 1 && "checkout-stepper-item-active",
            step > 1 && "checkout-stepper-item-done",
          )}
        >
          <span className="checkout-stepper-badge" aria-hidden="true">
            {step > 1 ? "✓" : "1"}
          </span>
          <span className="checkout-stepper-label">{step1Label}</span>
        </li>
        <li className="checkout-stepper-connector" aria-hidden="true" />
        <li
          className={cn(
            "checkout-stepper-item",
            step === 2 && "checkout-stepper-item-active",
          )}
        >
          <span className="checkout-stepper-badge" aria-hidden="true">
            2
          </span>
          <span className="checkout-stepper-label">{step2Label}</span>
        </li>
      </ol>
    </nav>
  );
}
