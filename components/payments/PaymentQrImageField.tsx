"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadPaymentQrImage } from "@/lib/settings/actions";

interface PaymentQrImageFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}

export function PaymentQrImageField({
  id,
  label,
  value,
  onChange,
}: PaymentQrImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

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

  function uploadFile(file: File) {
    setError(null);
    setUploadSuccess(false);
    clearPreview();

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadPaymentQrImage(formData);
      if (result.error) {
        setError(result.error);
        clearPreview();
        return;
      }
      if (result.url) {
        onChange(result.url);
        clearPreview();
        setUploadSuccess(true);
        window.setTimeout(() => setUploadSuccess(false), 3000);
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
    event.target.value = "";
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) uploadFile(file);
        return;
      }
    }
  }

  function handleRemove() {
    clearPreview();
    setUploadSuccess(false);
    onChange("");
  }

  return (
    <div className="sm:col-span-2" onPaste={handlePaste}>
      <label className="label-field" htmlFor={id}>
        {label}
        <span className="ml-1 font-normal text-zinc-400">(opcional)</span>
      </label>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Sube una imagen o pégala desde el portapapeles (Ctrl+V). Tus clientes
        podrán escanearla al pagar.
      </p>

      {error && (
        <p className="alert-error mt-2" role="alert">
          {error}
        </p>
      )}

      {uploadSuccess && (
        <p
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
          role="status"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          QR cargado correctamente
        </p>
      )}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        {displayUrl ? (
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
            <Image
              src={displayUrl}
              alt="Vista previa del código QR"
              fill
              sizes="144px"
              className="object-contain p-2"
              unoptimized={Boolean(previewUrl)}
            />
            {pending && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-950/70">
                <Loader2
                  className="h-8 w-8 animate-spin text-teal-600"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50">
            <ImagePlus className="h-8 w-8" aria-hidden="true" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="btn-brand-outline inline-flex items-center gap-2 self-start text-sm"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {displayUrl ? "Cambiar QR" : "Cargar imagen QR"}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="inline-flex items-center gap-2 self-start text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar QR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
