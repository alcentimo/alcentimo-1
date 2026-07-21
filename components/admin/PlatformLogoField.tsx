"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  clearPlatformLogo,
  uploadPlatformLogo,
} from "@/lib/admin/platform-settings-actions";
import { cn } from "@/lib/cn";

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const LOGO_HELP =
  "PNG con fondo transparente recomendado. Máximo 2 MB. Se optimiza automáticamente para web.";

interface PlatformLogoFieldProps {
  platformName: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export function PlatformLogoField({
  platformName,
  value,
  onChange,
}: PlatformLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayUrl = previewUrl ?? value;

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
    setNotice(null);
    clearPreview();

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadPlatformLogo(formData);
      if (result.error) {
        setError(result.error);
        clearPreview();
        return;
      }
      if (result.url) {
        onChange(result.url);
        clearPreview();
        setNotice("Logo actualizado. También se regeneraron los iconos PWA de la app.");
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
    setNotice(null);
    onChange(null);
    startTransition(async () => {
      const result = await clearPlatformLogo();
      if (result.error) {
        setError(result.error);
      } else {
        setNotice("Logo eliminado. Se usa la marca predeterminada.");
      }
    });
  }

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div
        className={cn(
          "relative flex h-14 min-w-[3.5rem] max-w-[8rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 px-2 ring-1 ring-zinc-200/60 sm:h-16 sm:rounded-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-800",
          pending && "opacity-70",
        )}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={`Logo de ${platformName}`}
            width={128}
            height={64}
            className="max-h-12 w-auto max-w-full object-contain"
            unoptimized={Boolean(previewUrl) || displayUrl.includes("?v=")}
          />
        ) : (
          <span className="brand-mark brand-mark-md">a</span>
        )}
        {pending && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-950/70"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Logo principal de la plataforma
        </p>
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          {LOGO_HELP}
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
            accept={LOGO_ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="btn-brand-outline inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {displayUrl ? "Cambiar logo" : "Subir logo"}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
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
