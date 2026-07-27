"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadCatalogBannerImage } from "@/lib/settings/actions";
import { compressBannerImageForUpload } from "@/lib/client-image-compress";
import type { BannerImageVariant } from "@/lib/banner-image";
import { BANNER_OPTIMIZE_HINT } from "@/lib/banner-image";
import { cn } from "@/lib/cn";

interface CatalogBannerImageUploadProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  variant: BannerImageVariant;
  onChange: (url: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function CatalogBannerImageUpload({
  id,
  label,
  hint,
  value,
  variant,
  onChange,
  disabled = false,
  required = false,
}: CatalogBannerImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [pending, startTransition] = useTransition();

  const isBusy = compressing || pending;
  const displayUrl = previewUrl ?? (value || null);

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
    setUploadSuccess(false);
    clearPreview();
    setCompressing(true);

    let optimizedFile = file;
    try {
      const { file: compressed } = await compressBannerImageForUpload(file, variant);
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
    formData.set("variant", variant);

    startTransition(async () => {
      const result = await uploadCatalogBannerImage(formData);
      if (result.error) {
        setError(result.error);
        clearPreview();
        return;
      }

      if (result.url) {
        onChange(result.url);
        clearPreview();
        setUploadSuccess(true);
        window.setTimeout(() => setUploadSuccess(false), 2500);
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
    setUploadSuccess(false);
    onChange("");
  }

  return (
    <div className="design-banner-upload">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {label}
            {required ? (
              <span className="ml-1 text-xs font-normal text-zinc-400">(requerida)</span>
            ) : (
              <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
            )}
          </label>
          {hint ? (
            <p className="mt-0.5 text-xs leading-snug text-zinc-500">{hint}</p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-zinc-500">
              {BANNER_OPTIMIZE_HINT}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {uploadSuccess ? (
        <p
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
          role="status"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Imagen cargada
        </p>
      ) : null}

      <div className="mt-2 flex items-start gap-2.5">
        <div
          className={cn(
            "design-banner-upload-preview",
            !displayUrl && "design-banner-upload-preview-empty",
          )}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt=""
              fill
              sizes="160px"
              className="object-cover"
              unoptimized={Boolean(previewUrl)}
            />
          ) : (
            <ImagePlus className="h-5 w-5 text-zinc-400" aria-hidden="true" />
          )}
          {isBusy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-zinc-950/75">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || isBusy}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isBusy}
            className="btn-brand-outline inline-flex items-center gap-2 self-start px-3 py-1.5 text-xs"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {displayUrl ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {displayUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isBusy}
              className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Quitar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
