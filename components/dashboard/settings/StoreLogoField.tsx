"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Store, Trash2 } from "lucide-react";
import { uploadStoreLogo } from "@/lib/settings/actions";
import { compressImageForUpload } from "@/lib/client-image-compress";
import { PRODUCT_IMAGE_OPTIMIZE_HINT } from "@/lib/product-image";
import { cn } from "@/lib/cn";

interface StoreLogoFieldProps {
  storeName: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function StoreLogoField({ storeName, value, onChange }: StoreLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [pending, startTransition] = useTransition();

  const isBusy = compressing || pending;

  const displayUrl = previewUrl ?? value;
  const initials = getStoreInitials(storeName);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }

  async function uploadFile(file: File) {
    setError(null);
    clearPreview();
    setCompressing(true);

    let optimizedFile = file;
    try {
      const { file: compressed } = await compressImageForUpload(file);
      optimizedFile = compressed;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo optimizar la imagen. Prueba con JPG o PNG.",
      );
      setCompressing(false);
      return;
    } finally {
      setCompressing(false);
    }

    const localUrl = URL.createObjectURL(optimizedFile);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.set("file", optimizedFile);

    startTransition(async () => {
      const result = await uploadStoreLogo(formData);
      if (result.error) {
        setError(result.error);
        clearPreview();
        return;
      }
      if (result.url) {
        onChange(result.url);
        clearPreview();
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
    event.target.value = "";
  }

  function handleRemove() {
    clearPreview();
    onChange(null);
  }

  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 ring-1 ring-zinc-200/60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-800",
          isBusy && "opacity-70",
        )}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Logo de la tienda"
            fill
            sizes="64px"
            className="object-cover"
            unoptimized={Boolean(previewUrl)}
          />
        ) : (
          <span className="flex flex-col items-center gap-0.5 text-zinc-400">
            {storeName.trim() ? (
              <span className="text-sm font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
                {initials}
              </span>
            ) : (
              <Store className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
        )}
        {(compressing || pending) && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/70 dark:bg-zinc-950/70"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" aria-hidden="true" />
            {compressing && (
              <span className="text-[9px] font-medium text-teal-700 dark:text-teal-300">
                Optimizando…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Logo de la tienda</p>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          JPG, PNG o WebP. {PRODUCT_IMAGE_OPTIMIZE_HINT}
        </p>

        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
            className="btn-brand-outline inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
          >
            {compressing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {compressing ? "Optimizando…" : displayUrl ? "Cambiar logo" : "Subir logo"}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 px-1 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
