"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Camera,
  GripVertical,
  ImagePlus,
  Images,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import {
  PRODUCT_IMAGE_OPTIMIZE_HINT,
  PRODUCT_IMAGE_RECOMMENDED_HINT,
} from "@/lib/product-image";
import {
  autoCropAndCompressProductImage,
  PRODUCT_IMAGE_CAMERA_CAPTURE,
  PRODUCT_IMAGE_CAMERA_HINT,
  PRODUCT_IMAGE_FILE_ACCEPT,
  revokeProductImagePreview,
} from "@/lib/product-image-picker";
import {
  isCameraApiSupported,
  isMobileCameraDevice,
} from "@/lib/product-camera";
import type { ProductEditImage } from "@/lib/products/product-gallery-types";
import { ProductCameraCaptureDialog } from "@/components/dashboard/ProductCameraCaptureDialog";
import { cn } from "@/lib/cn";

const MAX_GALLERY_IMAGES = 10;
const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

export interface GalleryFieldItem {
  clientId: string;
  previewUrl: string;
  file?: File;
  dbId?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductGalleryFieldValue {
  items: GalleryFieldItem[];
  removedDbIds: string[];
}

interface ProductGalleryFieldProps {
  id: string;
  mode?: "create" | "edit";
  layout?: "stacked" | "compact";
  initialImages?: ProductEditImage[];
  disabled?: boolean;
  onChange: (value: ProductGalleryFieldValue) => void;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_FILE_PATTERN.test(file.name);
}

function createClientId(): string {
  return crypto.randomUUID();
}

function mapInitialImages(initialImages: ProductEditImage[]): GalleryFieldItem[] {
  return initialImages.map((image, index) => ({
    clientId: image.id,
    previewUrl: image.thumbUrl,
    dbId: image.id,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder ?? index,
  }));
}

function normalizeItems(items: GalleryFieldItem[]): GalleryFieldItem[] {
  const sorted = items.map((item, index) => ({ ...item, sortOrder: index }));
  const primaryIndex = sorted.findIndex((item) => item.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return sorted.map((item, index) => ({
    ...item,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function buildProductImagesFormPayload(value: ProductGalleryFieldValue): {
  json: string;
  files: File[];
} {
  const normalized = normalizeItems(value.items);

  return {
    json: JSON.stringify({
      keep: normalized
        .filter((item) => item.dbId)
        .map((item) => ({
          id: item.dbId!,
          sortOrder: item.sortOrder,
          isPrimary: item.isPrimary,
        })),
      removedIds: value.removedDbIds,
    }),
    files: normalized
      .filter((item): item is GalleryFieldItem & { file: File } => Boolean(item.file))
      .map((item) => item.file),
  };
}

export function ProductGalleryField({
  id,
  mode = "create",
  layout = "stacked",
  initialImages = [],
  disabled = false,
  onChange,
  onError,
  onBusyChange,
  onReadyChange,
}: ProductGalleryFieldProps) {
  const reactId = useId();
  const galleryInputId = `${id}-gallery-${reactId}`;
  const cameraInputId = `${id}-camera-${reactId}`;
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<GalleryFieldItem[]>([]);
  const removedDbIdsRef = useRef<string[]>([]);

  const [items, setItems] = useState<GalleryFieldItem[]>(() =>
    mapInitialImages(initialImages),
  );
  const [removedDbIds, setRemovedDbIds] = useState<string[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  itemsRef.current = items;
  removedDbIdsRef.current = removedDbIds;

  const isBusy = processingCount > 0 || disabled;
  const canAddMore = items.length < MAX_GALLERY_IMAGES;
  const pickerDisabled = isBusy || !canAddMore;

  const reportError = useCallback(
    (message: string) => {
      setFieldError(message);
      onError?.(message);
    },
    [onError],
  );

  const clearError = useCallback(() => {
    setFieldError(null);
  }, []);

  const emitChange = useCallback(
    (nextItems: GalleryFieldItem[], nextRemoved = removedDbIdsRef.current) => {
      const normalized = normalizeItems(nextItems);
      setItems(normalized);
      setRemovedDbIds(nextRemoved);
      onChange({ items: normalized, removedDbIds: nextRemoved });
      onReadyChange?.(normalized.length > 0);
    },
    [onChange, onReadyChange],
  );

  useEffect(() => {
    onBusyChange?.(processingCount > 0);
  }, [onBusyChange, processingCount]);

  useEffect(() => {
    onReadyChange?.(items.length > 0);
  }, [items.length, onReadyChange]);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        revokeProductImagePreview(item.previewUrl);
      }
    };
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      clearError();

      const files = Array.from(fileList).filter(isImageFile);
      if (files.length === 0) {
        reportError("Selecciona archivos de imagen válidos (JPG, PNG o WebP).");
        return;
      }

      const availableSlots = MAX_GALLERY_IMAGES - itemsRef.current.length;
      if (availableSlots <= 0) {
        reportError(`Máximo ${MAX_GALLERY_IMAGES} fotos por producto.`);
        return;
      }

      const batch = files.slice(0, availableSlots);
      if (batch.length < files.length) {
        reportError(
          `Solo se agregaron ${batch.length} foto(s). Máximo ${MAX_GALLERY_IMAGES} por producto.`,
        );
      }

      setProcessingCount((count) => count + batch.length);

      const nextItems = [...itemsRef.current];
      let successCount = 0;

      for (const file of batch) {
        try {
          const result = await autoCropAndCompressProductImage(file);

          if (!result.ok) {
            reportError(result.error);
            continue;
          }

          nextItems.push({
            clientId: createClientId(),
            previewUrl: result.previewUrl,
            file: result.file,
            isPrimary: nextItems.length === 0,
            sortOrder: nextItems.length,
          });
          successCount += 1;
        } catch (error) {
          reportError(
            error instanceof Error
              ? error.message
              : "No se pudo procesar una de las fotos.",
          );
        } finally {
          setProcessingCount((count) => Math.max(0, count - 1));
        }
      }

      if (successCount > 0) {
        clearError();
        emitChange(nextItems);
      }
    },
    [clearError, emitChange, reportError],
  );

  function handleGalleryInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    void processFiles(files);
    event.target.value = "";
  }

  function handleCameraInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void processFiles([file]);
  }

  async function handleTakePhotoClick() {
    if (pickerDisabled) return;
    clearError();

    if (isMobileCameraDevice()) {
      cameraInputRef.current?.click();
      return;
    }

    if (!isCameraApiSupported()) {
      reportError("No se detectó una cámara web conectada.");
      return;
    }

    setCameraDialogOpen(true);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (pickerDisabled) return;
    const files = event.dataTransfer.files;
    if (!files?.length) return;
    void processFiles(files);
  }

  function setPrimary(clientId: string) {
    emitChange(
      items.map((item) => ({
        ...item,
        isPrimary: item.clientId === clientId,
      })),
    );
  }

  function removeItem(clientId: string) {
    const target = items.find((item) => item.clientId === clientId);
    if (!target) return;

    revokeProductImagePreview(target.previewUrl);
    const nextRemoved = target.dbId
      ? [...removedDbIds, target.dbId]
      : removedDbIds;

    emitChange(
      items.filter((item) => item.clientId !== clientId),
      nextRemoved,
    );
  }

  function handleDragStart(clientId: string) {
    setDraggingId(clientId);
  }

  function handleDragOver(event: React.DragEvent, clientId: string) {
    event.preventDefault();
    setDragOverId(clientId);
  }

  function handleDropReorder(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = items.findIndex((item) => item.clientId === draggingId);
    const toIndex = items.findIndex((item) => item.clientId === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved!);
    emitChange(nextItems);
    setDraggingId(null);
    setDragOverId(null);
  }

  const pickerButtonClass = cn(
    "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
    pickerDisabled && "pointer-events-none cursor-not-allowed opacity-60",
  );

  const label = layout === "compact" ? "Fotos del producto" : "Galería de fotos";

  return (
    <>
      <div className={layout === "compact" ? "space-y-2" : "space-y-3"}>
        <div>
          <p className={layout === "compact" ? "payment-field-label" : "label-field"}>
            {label}
          </p>
          <p
            className={cn(
              "text-zinc-500 dark:text-zinc-400",
              layout === "compact" ? "mt-0.5 text-[11px]" : "mt-1 text-xs",
            )}
          >
            {PRODUCT_IMAGE_RECOMMENDED_HINT}. Puedes subir hasta {MAX_GALLERY_IMAGES} fotos.
          </p>
        </div>

        {fieldError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
            role="alert"
          >
            {fieldError}
          </p>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={handleDrop}
          className={cn(
            "rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40",
            isBusy && "opacity-70",
          )}
        >
          {items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <li
                  key={item.clientId}
                  draggable={!isBusy}
                  onDragStart={() => handleDragStart(item.clientId)}
                  onDragOver={(event) => handleDragOver(event, item.clientId)}
                  onDrop={(event) => handleDropReorder(event, item.clientId)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950",
                    dragOverId === item.clientId && "ring-2 ring-teal-500",
                    draggingId === item.clientId && "opacity-60",
                  )}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={item.previewUrl}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                      unoptimized={item.previewUrl.startsWith("blob:")}
                    />
                    {item.isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Principal
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-1 border-t border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center text-zinc-400"
                      aria-hidden="true"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="flex items-center gap-1">
                      {!item.isPrimary ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setPrimary(item.clientId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-amber-50 hover:text-amber-600"
                          aria-label="Marcar como principal"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeItem(item.clientId)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar foto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-zinc-500">
              <ImagePlus className="h-8 w-8 text-zinc-400" aria-hidden="true" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Arrastra varias fotos aquí
              </p>
              <p className="text-xs">o elige galería / cámara abajo</p>
            </div>
          )}

          <input
            ref={galleryInputRef}
            id={galleryInputId}
            type="file"
            accept={PRODUCT_IMAGE_FILE_ACCEPT}
            multiple
            onChange={handleGalleryInputChange}
            className="product-file-input-offscreen"
            tabIndex={-1}
          />
          <input
            ref={cameraInputRef}
            id={cameraInputId}
            type="file"
            accept={PRODUCT_IMAGE_FILE_ACCEPT}
            capture={PRODUCT_IMAGE_CAMERA_CAPTURE}
            onChange={handleCameraInputChange}
            className="product-file-input-offscreen"
            tabIndex={-1}
          />

          <div
            className={cn(
              "mt-3 flex flex-col gap-2 sm:flex-row",
              layout === "compact" ? "sm:flex-col" : "",
            )}
          >
            {pickerDisabled ? (
              <span className={pickerButtonClass}>
                {processingCount > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Procesando {processingCount} foto{processingCount !== 1 ? "s" : ""}…
                  </>
                ) : (
                  <>
                    <Images className="h-4 w-4" aria-hidden="true" />
                    {items.length > 0 ? "Agregar de galería" : "Seleccionar fotos"}
                  </>
                )}
              </span>
            ) : (
              <label htmlFor={galleryInputId} className={pickerButtonClass}>
                {processingCount > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Procesando {processingCount} foto{processingCount !== 1 ? "s" : ""}…
                  </>
                ) : (
                  <>
                    <Images className="h-4 w-4" aria-hidden="true" />
                    {items.length > 0 ? "Agregar de galería" : "Seleccionar fotos"}
                  </>
                )}
              </label>
            )}

            {isMobileCameraDevice() ? (
              pickerDisabled ? (
                <span className={pickerButtonClass}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Tomar foto
                </span>
              ) : (
                <label htmlFor={cameraInputId} className={pickerButtonClass}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Tomar foto
                </label>
              )
            ) : (
              <button
                type="button"
                disabled={pickerDisabled}
                onClick={() => void handleTakePhotoClick()}
                className={pickerButtonClass}
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Tomar foto
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-400">
          {PRODUCT_IMAGE_OPTIMIZE_HINT} {PRODUCT_IMAGE_CAMERA_HINT}
          {mode === "edit" ? " Puedes reordenar, marcar principal o eliminar fotos." : ""}
        </p>
      </div>

      <ProductCameraCaptureDialog
        open={cameraDialogOpen}
        onClose={() => setCameraDialogOpen(false)}
        onCapture={(file) => void processFiles([file])}
        onError={reportError}
      />
    </>
  );
}
