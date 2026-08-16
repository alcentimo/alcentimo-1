"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface SocialImageDownloadButtonProps {
  imageUrl: string;
  productTitle: string;
  className?: string;
}

/** Descarga JPEG 1080×1080 listo para Instagram, Facebook o WhatsApp. */
export function SocialImageDownloadButton({
  imageUrl,
  productTitle,
  className,
}: SocialImageDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        url: imageUrl,
        title: productTitle,
      });
      const response = await fetch(`/api/dropship/social-image?${params}`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        let message = "No se pudo descargar la imagen.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // ignore
        }
        setError(message);
        setLoading(false);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/i.exec(disposition);
      anchor.href = objectUrl;
      anchor.download = match?.[1] || "producto-redes.jpg";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setLoading(false);
    } catch {
      setError("No se pudo descargar la imagen. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={loading || !imageUrl}
        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {loading ? "Preparando…" : "Descargar para redes"}
      </button>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
          JPEG {`1080×1080`} listo para Instagram, Facebook o WhatsApp
        </p>
      )}
    </div>
  );
}
