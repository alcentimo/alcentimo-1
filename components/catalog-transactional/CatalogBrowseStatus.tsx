"use client";

import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

interface CatalogBrowseStatusProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function CatalogBrowseStatus({
  loading = false,
  error = null,
  onRetry,
  className,
}: CatalogBrowseStatusProps) {
  if (!loading && !error) return null;

  return (
    <div
      className={cn("catalog-browse-status", className)}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      {loading ? (
        <p className="catalog-browse-status-loading">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Actualizando resultados…
        </p>
      ) : null}

      {error ? (
        <div className="catalog-browse-status-error">
          <p className="catalog-browse-status-error-text">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="catalog-browse-status-retry">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
