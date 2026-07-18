"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Store, Trash2 } from "lucide-react";
import { uploadStoreLogo, clearStoreLogo } from "@/lib/settings/actions";
import { readImageFileDimensions } from "@/lib/store-logo/read-image-dimensions";
import {
  STORE_LOGO_ACCEPT,
  STORE_LOGO_HELP_TEXT,
} from "@/lib/store-logo/constants";
import {
  validateStoreLogoDimensions,
  validateStoreLogoMimeType,
} from "@/lib/store-logo/validate";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [pending, startTransition] = useTransition();

  const isBusy = validating || pending;

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
    setNotice(null);
    clearPreview();
    setValidating(true);

    const mimeError = validateStoreLogoMimeType(file.type);
    if (mimeError) {
      setError(mimeError);
      setValidating(false);
      return;
    }

    try {
      const { width, height } = await readImageFileDimensions(file);
      const validation = validateStoreLogoDimensions(width, height);

      if (!validation.ok) {
        setError(validation.error);
        setValidating(false);
        return;
      }

      if (validation.warning) {
        setNotice(validation.warning);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo validar la imagen.",
      );
      setValidating(false);
      return;
    }

    setValidating(false);

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.set("file", file);

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
        if (result.warning) {
          setNotice(result.warning);
        } else {
          setNotice("Logo listo. Generamos los iconos PWA de tu catálogo automáticamente.");
        }
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
    event.target.value = "";
  }

  function handleRemove() {
    clearPreview();
    setNotice(null);
    onChange(null);
    startTransition(async () => {
      const result = await clearStoreLogo();
      if (result.error) {
        setError(result.error);
      }
    });
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
            className="object-contain p-1"
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
        {isBusy && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/70 dark:bg-zinc-950/70"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
            {validating && (
              <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300">
                Validando…
              </span>
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Logo de la tienda</p>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          {STORE_LOGO_HELP_TEXT}
        </p>

        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {notice && !error && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300" role="status">
            {notice}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <input
            ref={inputRef}
            type="file"
            accept={STORE_LOGO_ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
            className="btn-brand-outline inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {validating ? "Validando…" : displayUrl ? "Cambiar logo" : "Subir logo"}
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
