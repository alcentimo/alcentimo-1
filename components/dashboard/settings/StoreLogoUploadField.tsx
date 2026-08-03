"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { clearStoreLogo, uploadStoreLogo } from "@/lib/settings/actions";
import {
  STORE_LOGO_ACCEPT,
  STORE_LOGO_HELP_TEXT,
} from "@/lib/store-logo/constants";
import { isGifImageUrl } from "@/lib/media/is-gif-url";
import { cn } from "@/lib/cn";

interface StoreLogoUploadFieldProps {
  logoUrl: string | null;
  storeName: string;
  disabled?: boolean;
  onLogoChange: (url: string | null) => void;
}

/** Subida de logo de tienda (bucket store-logos + stores.logo_url). */
export function StoreLogoUploadField({
  logoUrl,
  storeName,
  disabled = false,
  onLogoChange,
}: StoreLogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const displayUrl = previewUrl ?? logoUrl;
  const initials = storeName.trim().charAt(0).toUpperCase() || "T";

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

  function uploadFile(file: File) {
    setError(null);
    setWarning(null);
    setUploadSuccess(false);
    clearPreview();

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
        onLogoChange(result.url);
        clearPreview();
        setUploadSuccess(true);
        if (result.warning) setWarning(result.warning);
        window.setTimeout(() => setUploadSuccess(false), 2500);
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
    event.target.value = "";
  }

  function handleRemove() {
    setError(null);
    setWarning(null);
    setUploadSuccess(false);
    clearPreview();

    startTransition(async () => {
      const result = await clearStoreLogo();
      if (result.error) {
        setError(result.error);
        return;
      }
      onLogoChange(null);
    });
  }

  return (
    <div className="space-y-2">
      <LabelRow />
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 sm:h-[4.5rem] sm:w-[4.5rem]",
            !displayUrl && "flex items-center justify-center",
          )}
          aria-label={displayUrl ? "Cambiar logotipo" : "Subir logotipo"}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`Logo de ${storeName}`}
              fill
              sizes="72px"
              className="object-cover"
              unoptimized={
                Boolean(previewUrl) || isGifImageUrl(displayUrl)
              }
            />
          ) : (
            <span className="text-lg font-semibold text-zinc-400" aria-hidden="true">
              {initials}
            </span>
          )}
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-zinc-950/75">
              <Loader2
                className="h-5 w-5 animate-spin text-teal-600"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            ref={inputRef}
            id="store-logo-upload"
            type="file"
            accept={STORE_LOGO_ACCEPT}
            className="sr-only"
            disabled={disabled || pending}
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || pending}
              className="btn-brand-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {displayUrl ? "Cambiar logo" : "Subir logotipo"}
            </button>
            {displayUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || pending}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Quitar
              </button>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {STORE_LOGO_HELP_TEXT}
          </p>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {warning && !error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          role="status"
        >
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <p>{warning}</p>
        </div>
      ) : null}
      {uploadSuccess ? (
        <p
          className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300"
          role="status"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Logo actualizado
        </p>
      ) : null}
    </div>
  );
}

function LabelRow() {
  return (
    <label htmlFor="store-logo-upload" className="payment-field-label">
      Logotipo
    </label>
  );
}
