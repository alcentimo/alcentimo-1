"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  Check,
  ImagePlus,
  Images,
  Loader2,
  Package,
  Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { uploadCatalogBannerImage } from "@/lib/settings/actions";
import { compressBannerImageForUpload } from "@/lib/client-image-compress";
import type { BannerImageVariant } from "@/lib/banner-image";
import { BANNER_OPTIMIZE_HINT } from "@/lib/banner-image";
import {
  PRODUCT_IMAGE_CAMERA_CAPTURE,
  PRODUCT_IMAGE_FILE_ACCEPT,
} from "@/lib/product-image-picker";
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
  layout?: "default" | "compact";
  /** Tercera opción del menú: usar imagen de un producto del inventario. */
  onPickFromInventory?: () => void;
  inventoryOptionLabel?: string;
  /** Elimina el slide del carrusel (prioridad sobre solo vaciar la URL). */
  onRemoveSlide?: () => void;
  removeSlideLabel?: string;
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
  layout = "default",
  onPickFromInventory,
  inventoryOptionLabel = "Usar imagen de un producto",
  onRemoveSlide,
  removeSlideLabel = "Eliminar",
}: CatalogBannerImageUploadProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [pending, startTransition] = useTransition();

  const isBusy = compressing || pending;
  const displayUrl = previewUrl ?? (value || null);
  const pickLabel = displayUrl ? "Cambiar imagen" : "Subir imagen";

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

  function triggerInput(input: HTMLInputElement | null) {
    if (!input || disabled || isBusy) return;
    input.value = "";
    input.click();
  }

  function handleRemove() {
    clearPreview();
    setUploadSuccess(false);
    if (onRemoveSlide) {
      onRemoveSlide();
      return;
    }
    onChange("");
  }

  const fileInputs = (
    <>
      <input
        ref={galleryInputRef}
        id={`${id}-gallery`}
        type="file"
        accept={PRODUCT_IMAGE_FILE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || isBusy}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        id={`${id}-camera`}
        type="file"
        accept={PRODUCT_IMAGE_FILE_ACCEPT}
        capture={PRODUCT_IMAGE_CAMERA_CAPTURE}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || isBusy}
        onChange={handleFileChange}
      />
    </>
  );

  const sourceMenu = (close: () => void) => (
    <>
      <DropdownMenuItem
        disabled={disabled || isBusy}
        onClick={() => {
          triggerInput(galleryInputRef.current);
          close();
        }}
      >
        <Images className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
        Cargar desde galería
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={disabled || isBusy}
        onClick={() => {
          triggerInput(cameraInputRef.current);
          close();
        }}
      >
        <Camera className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
        Tomar una foto
      </DropdownMenuItem>
      {onPickFromInventory ? (
        <DropdownMenuItem
          disabled={disabled || isBusy}
          onClick={() => {
            onPickFromInventory();
            close();
          }}
        >
          <Package className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
          {inventoryOptionLabel}
        </DropdownMenuItem>
      ) : null}
    </>
  );

  const pickButton = (
    <DropdownMenu
      align="start"
      className="w-full sm:w-auto"
      menuClassName="min-w-[15.5rem]"
      trigger={
        <button
          type="button"
          disabled={disabled || isBusy}
          className="btn-brand-outline inline-flex items-center gap-2 self-start px-3 py-1.5 text-xs"
          aria-label={pickLabel}
          aria-haspopup="menu"
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {pickLabel}
        </button>
      }
    >
      {sourceMenu}
    </DropdownMenu>
  );

  if (layout === "compact") {
    return (
      <div className="design-banner-upload-compact">
        {fileInputs}
        {error ? (
          <p
            className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {uploadSuccess ? (
          <p
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
            role="status"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Imagen cargada
          </p>
        ) : null}

        <div className="flex items-start gap-2.5">
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
                sizes="112px"
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
            <div className="flex flex-wrap items-center gap-2">
              {pickButton}
              {onRemoveSlide ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || isBusy}
                  className="design-banner-upload-delete-btn"
                  aria-label={removeSlideLabel}
                  title={removeSlideLabel}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {removeSlideLabel}
                </button>
              ) : null}
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">
              Galería, cámara o imagen de un producto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="design-banner-upload">
      {fileInputs}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={`${id}-gallery`} className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
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
          {pickButton}
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
