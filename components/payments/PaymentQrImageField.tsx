"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  function uploadFile(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadPaymentQrImage(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        onChange(result.url);
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

  return (
    <div className="sm:col-span-2" onPaste={handlePaste}>
      <label className="label-field" htmlFor={id}>
        {label}
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

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        {value ? (
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
            <Image
              src={value}
              alt="Código QR de Pago Móvil"
              fill
              sizes="144px"
              className="object-contain p-2"
            />
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
            {value ? "Cambiar QR" : "Cargar imagen QR"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
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
