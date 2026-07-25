"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  clearPlatformLogo,
  uploadPlatformLogo,
} from "@/lib/admin/platform-settings-actions";
import { cn } from "@/lib/cn";

export const PLATFORM_LOGO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg";
const LOGO_HELP =
  "PNG, SVG o WebP con fondo transparente recomendado. Máximo 2 MB. Se optimiza automáticamente para web e iconos PWA.";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function isAllowedLogoFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return file.name.toLowerCase().endsWith(".svg");
}

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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasPendingChanges = pendingFile !== null;
  const displayUrl = previewUrl ?? value;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearPreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const resetPendingSelection = useCallback(() => {
    clearPreview();
    setPendingFile(null);
  }, [clearPreview]);

  const selectFile = useCallback(
    (file: File) => {
      setError(null);
      setNotice(null);

      if (!isAllowedLogoFile(file)) {
        setError("Formato no permitido. Usa PNG, SVG, WebP o JPG.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen supera el límite de 2 MB.");
        return;
      }

      clearPreview();
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [clearPreview],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!pending) setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (pending) return;

    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  function handleSave() {
    if (!pendingFile) return;

    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.set("file", pendingFile);

    startTransition(async () => {
      const result = await uploadPlatformLogo(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        onChange(result.url);
        resetPendingSelection();
        setNotice("Logo guardado. Se actualizó en la landing, login y panel.");
        router.refresh();
      }
    });
  }

  function handleRemove() {
    resetPendingSelection();
    setNotice(null);
    setError(null);
    onChange(null);

    startTransition(async () => {
      const result = await clearPlatformLogo();
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotice("Logo eliminado. Se usa la marca predeterminada.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!pending) inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!pending) inputRef.current?.click();
        }}
        className={cn(
          "platform-logo-dropzone relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors sm:flex-row sm:gap-5 sm:px-5 sm:py-5 sm:text-left",
          dragActive
            ? "border-emerald-500 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/20"
            : "border-zinc-200 bg-zinc-50/80 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/10",
          pending && "pointer-events-none opacity-80",
        )}
      >
        <div
          className={cn(
            "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white ring-1 ring-zinc-200/60 dark:border-zinc-700 dark:bg-zinc-950 dark:ring-zinc-800",
            pending && "opacity-70",
          )}
        >
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={`Logo de ${platformName}`}
              width={128}
              height={64}
              className="max-h-14 w-auto max-w-full object-contain p-1"
              unoptimized={
                Boolean(previewUrl) ||
                displayUrl.includes("?v=") ||
                displayUrl.toLowerCase().includes(".svg")
              }
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

        <div className="mt-3 min-w-0 sm:mt-0 sm:flex-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {hasPendingChanges
              ? "Vista previa del nuevo logo"
              : displayUrl
                ? "Logo actual de la plataforma"
                : "Sube el logo global de Alcentimo"}
          </p>
          <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
            {LOGO_HELP}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Arrastra una imagen aquí o haz clic para seleccionar
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={PLATFORM_LOGO_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
          disabled={pending}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {notice && !error && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="btn-brand-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {displayUrl ? "Elegir otro archivo" : "Seleccionar logo"}
        </button>

        {hasPendingChanges && (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="btn-brand inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={resetPendingSelection}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancelar
            </button>
          </>
        )}

        {value && !hasPendingChanges && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Quitar logo
          </button>
        )}
      </div>
    </div>
  );
}
