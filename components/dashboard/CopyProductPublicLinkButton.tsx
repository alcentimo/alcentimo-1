"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getStoreProductPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface CopyProductPublicLinkButtonProps {
  storeSlug: string;
  productSlug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  className?: string;
}

export function CopyProductPublicLinkButton({
  storeSlug,
  productSlug,
  customDomain = null,
  customDomainVerified = false,
  className,
}: CopyProductPublicLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const productUrl = useMemo(
    () =>
      getStoreProductPublicUrl(storeSlug, productSlug, {
        customDomain,
        customDomainVerified,
      }),
    [storeSlug, productSlug, customDomain, customDomainVerified],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition disabled:opacity-60",
          copied
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900",
        )}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace del producto"}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "¡Enlace copiado!" : "Copiar enlace"}
      </button>
      {copied ? (
        <span
          role="status"
          className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
        >
          ¡Enlace copiado!
        </span>
      ) : null}
    </div>
  );
}
