"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface PublicCatalogQuickLinkProps {
  storeSlug: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  collapsed?: boolean;
  variant?: "default" | "header";
  onNavigate?: () => void;
  className?: string;
}

export function PublicCatalogQuickLink({
  storeSlug,
  customDomain = null,
  customDomainVerified = false,
  collapsed = false,
  variant = "default",
  onNavigate,
  className,
}: PublicCatalogQuickLinkProps) {
  const [copied, setCopied] = useState(false);
  const catalogUrl = useMemo(() => {
    if (!storeSlug) return null;
    return getStoreCatalogPublicUrl(storeSlug, "/", {
      customDomain,
      customDomainVerified,
    });
  }, [storeSlug, customDomain, customDomainVerified]);

  async function handleCopyLink() {
    if (!catalogUrl) return;

    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!catalogUrl) {
    if (variant === "header") return null;

    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-zinc-200 px-3 py-2.5 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500",
          collapsed ? "mx-2 text-center" : "mx-3",
          className,
        )}
        title="Configura tu tienda para ver el catálogo"
      >
        {collapsed ? "…" : "Configura tu tienda para ver el catálogo."}
      </div>
    );
  }

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          title={copied ? "Enlace copiado" : "Copiar enlace del catálogo"}
          aria-label={copied ? "Enlace copiado" : "Copiar enlace del catálogo"}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            copied
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
          )}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          title="Ver mi catálogo"
          aria-label="Ver mi catálogo en una nueva pestaña"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-600/20 bg-teal-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 dark:border-teal-500/30 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Ver catálogo</span>
          <span className="sm:hidden">Catálogo</span>
        </a>
      </div>
    );
  }

  if (collapsed) {
    return (
      <a
        href={catalogUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        title="Ver mi catálogo"
        aria-label="Ver mi catálogo en una nueva pestaña"
        className={cn(
          "mx-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-600/20 bg-teal-600 text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:border-teal-500/30 dark:bg-teal-600 dark:hover:bg-teal-500",
          className,
        )}
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-stretch",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void handleCopyLink()}
        title={catalogUrl}
        aria-label={copied ? "Enlace copiado" : "Copiar enlace de tienda"}
        className={cn(
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition-all",
          copied
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        )}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">¡Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Copiar enlace de tienda</span>
          </>
        )}
      </button>

      <a
        href={catalogUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        title="Ver mi catálogo"
        aria-label="Ver mi catálogo en una nueva pestaña"
        className="inline-flex min-h-10 items-center justify-center gap-2.5 rounded-xl border border-teal-600/20 bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:border-teal-500/30 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Ver mi catálogo</span>
      </a>
    </div>
  );
}
