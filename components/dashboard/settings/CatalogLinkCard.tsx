"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface CatalogLinkCardProps {
  slug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  className?: string;
  variant?: "settings" | "dashboard";
}

export function CatalogLinkCard({
  slug,
  customDomain = null,
  customDomainVerified = false,
  className,
  variant = "settings",
}: CatalogLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const catalogUrl = useMemo(
    () =>
      getStoreCatalogPublicUrl(slug, "/", {
        customDomain,
        customDomainVerified,
      }),
    [slug, customDomain, customDomainVerified],
  );
  const catalogHostLabel = useMemo(() => {
    try {
      const url = new URL(catalogUrl);
      return url.host + (url.pathname === "/" ? "" : url.pathname.replace(/\/$/, ""));
    } catch {
      return catalogUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  }, [catalogUrl]);

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
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Enlace oficial de tu tienda
        </p>
        <p className="mt-2 break-all text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {catalogHostLabel}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "btn-brand mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold sm:w-auto sm:min-w-[11rem]",
            copied && "bg-emerald-700",
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
        "general-catalog-link-card rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25",
        className,
      )}
    >
      <p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
        Este es tu enlace oficial para compartir con clientes. Ábrelo o cópialo
        tal como aparece aquí.
      </p>

      <p className="mt-3 break-all font-mono text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
        {catalogHostLabel}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
            copied
              ? "bg-emerald-700 text-white"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
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
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200/90 bg-white px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900 dark:bg-zinc-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Abrir catálogo
        </a>
      </div>
    </div>
  );
}
