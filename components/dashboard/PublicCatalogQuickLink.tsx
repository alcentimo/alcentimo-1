"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface PublicCatalogQuickLinkProps {
  storeSlug: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function PublicCatalogQuickLink({
  storeSlug,
  collapsed = false,
  onNavigate,
  className,
}: PublicCatalogQuickLinkProps) {
  const catalogUrl = useMemo(() => {
    if (!storeSlug) return null;
    return getStoreCatalogPublicUrl(storeSlug);
  }, [storeSlug]);

  if (!catalogUrl) {
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

  return (
    <a
      href={catalogUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      title="Ver mi catálogo"
      aria-label="Ver mi catálogo en una nueva pestaña"
      className={cn(
        "flex items-center rounded-xl border border-teal-600/20 bg-teal-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md dark:border-teal-500/30 dark:bg-teal-600 dark:hover:bg-teal-500",
        collapsed
          ? "mx-2 h-10 w-10 shrink-0 justify-center p-0"
          : "mx-3 min-h-10 gap-2.5 px-3 py-2.5",
        className,
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">Ver mi catálogo</span>}
    </a>
  );
}
