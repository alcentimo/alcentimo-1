"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getPublicSiteHost } from "@/lib/site-url";
import { cn } from "@/lib/cn";

interface CatalogLinkCardProps {
  slug: string;
  className?: string;
  variant?: "settings" | "dashboard";
}

export function CatalogLinkCard({
  slug,
  className,
  variant = "settings",
}: CatalogLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const siteHost = useMemo(() => getPublicSiteHost(), []);
  const catalogUrl = `https://${siteHost}/c/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (variant === "dashboard") {
    return (
      <div
        className={cn(
          "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 sm:p-5",
          className,
        )}
      >
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Enlace público de tu tienda</p>
        <p className="mt-2 break-all text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {catalogUrl}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "btn-brand mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold sm:w-auto sm:min-w-[11rem]",
            copied && "bg-teal-700",
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar enlace
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "general-catalog-link-card flex flex-col rounded-xl border border-teal-100/80 bg-teal-50/40 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900/40 dark:bg-teal-950/20",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-teal-700/80 dark:text-teal-300/80">
          Enlace de tu catálogo
        </p>
        <p className="mt-1 break-all text-sm text-zinc-800 dark:text-zinc-100">
          <span className="text-zinc-500 dark:text-zinc-400">{siteHost}/c/</span>
          <span className="font-medium">{slug}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
          copied
            ? "border-teal-200 bg-white text-teal-700 dark:border-teal-800 dark:bg-zinc-950 dark:text-teal-300"
            : "border-teal-200/80 bg-white text-zinc-700 hover:bg-teal-50 dark:border-teal-900 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-teal-950/30",
        )}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copiar enlace
          </>
        )}
      </button>
    </div>
  );
}
