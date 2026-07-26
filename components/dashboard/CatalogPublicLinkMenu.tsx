"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface CatalogPublicLinkMenuProps {
  storeSlug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  className?: string;
}

export function CatalogPublicLinkMenu({
  storeSlug,
  customDomain = null,
  customDomainVerified = false,
  className,
}: CatalogPublicLinkMenuProps) {
  const [copied, setCopied] = useState(false);
  const catalogUrl = useMemo(
    () =>
      getStoreCatalogPublicUrl(storeSlug, "/", {
        customDomain,
        customDomainVerified,
      }),
    [storeSlug, customDomain, customDomainVerified],
  );

  async function handleCopy(close: () => void) {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
    close();
  }

  function handleOpenCatalog(close: () => void) {
    window.open(catalogUrl, "_blank", "noopener,noreferrer");
    close();
  }

  return (
    <DropdownMenu
      align="end"
      className={className}
      trigger={
        <Button
          type="button"
          variant="outline"
          aria-label="Opciones del catálogo público"
          className="h-10 shrink-0 gap-2 px-3 text-sm font-semibold sm:px-4"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Mi catálogo</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        </Button>
      }
    >
      {(close) => (
        <>
          <DropdownMenuItem onClick={() => handleOpenCatalog(close)}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Ver catálogo público
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleCopy(close)}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "¡Enlace copiado!" : "Copiar enlace de tienda"}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}
