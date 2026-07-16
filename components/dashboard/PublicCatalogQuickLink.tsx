"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { getPublicSiteHost } from "@/lib/site-url";
import { cn } from "@/lib/cn";

interface PublicCatalogQuickLinkProps {
  storeSlug: string | null;
  onNavigate?: () => void;
  className?: string;
}

export function PublicCatalogQuickLink({
  storeSlug,
  onNavigate,
  className,
}: PublicCatalogQuickLinkProps) {
  const catalogUrl = useMemo(() => {
    if (!storeSlug) return null;
    return `https://${getPublicSiteHost()}/c/${storeSlug}`;
  }, [storeSlug]);

  if (!catalogUrl) {
    return (
      <div
        className={cn(
          "mx-3 rounded-xl border border-dashed border-zinc-200 px-3 py-2.5 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500",
          className,
        )}
      >
        Configura tu tienda para ver el catálogo público.
      </div>
    );
  }

  return (
    <a
      href={catalogUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      className={cn(
        "mx-3 flex min-h-10 items-center gap-2.5 rounded-xl border border-teal-200/80 bg-teal-50/70 px-3 py-2.5 text-sm font-medium text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/50",
        className,
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">Ver mi catálogo público</span>
    </a>
  );
}
