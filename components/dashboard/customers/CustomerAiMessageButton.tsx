"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import { CustomerAiMessageDialog } from "@/components/dashboard/customers/CustomerAiMessageDialog";
import { cn } from "@/lib/cn";

interface CustomerAiMessageButtonProps {
  customer: StoreCustomerSummary;
  storeName: string;
  compact?: boolean;
  className?: string;
}

export function CustomerAiMessageButton({
  customer,
  storeName,
  compact = false,
  className,
}: CustomerAiMessageButtonProps) {
  const [open, setOpen] = useState(false);
  const displayName = customer.displayName?.trim() || "cliente";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-violet-200/80 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300",
          className,
        )}
        aria-label={`Generar mensaje con IA para ${displayName}`}
        title="Generar mensaje con IA"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {compact ? (
          <>
            <span aria-hidden="true">IA</span>
            <span className="sr-only">Generar mensaje con IA</span>
          </>
        ) : (
          "Generar mensaje con IA"
        )}
      </button>

      <CustomerAiMessageDialog
        open={open}
        onOpenChange={setOpen}
        customer={customer}
        storeName={storeName}
      />
    </>
  );
}
