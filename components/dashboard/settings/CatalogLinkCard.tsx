"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getPublicSiteHost } from "@/lib/site-url";
import { cn } from "@/lib/cn";

interface CatalogLinkCardProps {
  slug: string;
  className?: string;
}

export function CatalogLinkCard({ slug, className }: CatalogLinkCardProps) {
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

  return (
    <div
      className={cn(
        "general-catalog-link-card flex flex-col gap-3 rounded-xl border border-teal-100/80 bg-teal-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-teal-900/40 dark:bg-teal-950/20",
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
