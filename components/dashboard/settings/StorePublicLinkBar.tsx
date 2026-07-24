"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface StorePublicLinkBarProps {
  slug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  className?: string;
}

/** Enlace público unificado: copiar y abrir en una sola barra superior. */
export function StorePublicLinkBar({
  slug,
  customDomain = null,
  customDomainVerified = false,
  className,
}: StorePublicLinkBarProps) {
  const [copied, setCopied] = useState(false);
  const catalogUrl = useMemo(
    () =>
      getStoreCatalogPublicUrl(slug, "/", {
        customDomain,
        customDomainVerified,
      }),
    [slug, customDomain, customDomainVerified],
  );

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
    <div className={cn("settings-public-link-bar", className)}>
      <div className="min-w-0 flex-1">
        <p className="settings-public-link-label">Enlace público de tu tienda</p>
        <p className="settings-public-link-url">{catalogUrl}</p>
      </div>

      <div className="settings-public-link-actions">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(
            "settings-public-link-btn settings-public-link-btn-secondary",
            copied && "settings-public-link-btn-copied",
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
              Copiar
            </>
          )}
        </button>

        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="settings-public-link-btn settings-public-link-btn-primary"
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          Abrir catálogo
        </a>
      </div>
    </div>
  );
}
