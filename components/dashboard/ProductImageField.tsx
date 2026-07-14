"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Crop, ImagePlus, Loader2 } from "lucide-react";
import "react-easy-crop/react-easy-crop.css";
import {
  PRODUCT_IMAGE_ASPECT_CLASS,
  PRODUCT_IMAGE_CROP_HINT,
  PRODUCT_IMAGE_OPTIMIZE_HINT,
  PRODUCT_IMAGE_RECOMMENDED_HINT,
} from "@/lib/product-image";
import {
  autoCropAndCompressProductImage,
  compressSelectedProductImage,
  PRODUCT_IMAGE_CAMERA_HINT,
  PRODUCT_IMAGE_FILE_ACCEPT,
  PRODUCT_IMAGE_FILE_CAPTURE,
  revokeProductImagePreview,
} from "@/lib/product-image-picker";
import {
  getCroppedImageBlob,
  loadImage,
  percentCropToPixels,
  PRODUCT_IMAGE_ASPECT_RATIO,
} from "@/lib/product-image-crop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export interface ProductImageReadyPayload {
  file: File;
  previewUrl: string;
  message: string;
}

interface ProductImageFieldProps {
  id: string;
  mode?: "create" | "edit";
  layout?: "stacked" | "compact";
  initialPreviewUrl?: string | null;
  disabled?: boolean;
  onImageReady: (payload: ProductImageReadyPayload) => void;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
  /** true cuando hay imagen procesada lista para enviar (nueva en esta sesión). */
  onProcessedChange?: (processed: boolean) => void;
}

export function ProductImageField({
  id,
  mode = "create",
  layout = "stacked",
  initialPreviewUrl = null,
  disabled = false,
  onImageReady,
  onError,
  onBusyChange,
  onProcessedChange,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState<string | null>(
    initialPreviewUrl,
  );
  const [optimizeHint, setOptimizeHint] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [hasProcessedUpload, setHasProcessedUpload] = useState(false);

  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("producto.jpg");
  const [savedCropPercentages, setSavedCropPercentages] = useState<Area | undefined>();

  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [initialCropArea, setInitialCropArea] = useState<Area | undefined>();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);

  const isBusy = compressing || disabled;
  const canEditFraming = Boolean(originalImageSrc && confirmedPreviewUrl && !compressing);

  useEffect(() => {
    onBusyChange?.(compressing);
  }, [compressing, onBusyChange]);

  useEffect(() => {
    onProcessedChange?.(hasProcessedUpload);
  }, [hasProcessedUpload, onProcessedChange]);

  useEffect(() => {
    return () => revokeProductImagePreview(confirmedPreviewUrl);
  }, [confirmedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (originalImageSrc) URL.revokeObjectURL(originalImageSrc);
    };
  }, [originalImageSrc]);

  const applyProcessedImage = useCallback(
    (payload: ProductImageReadyPayload) => {
      revokeProductImagePreview(confirmedPreviewUrl);
      setConfirmedPreviewUrl(payload.previewUrl);
      setOptimizeHint(payload.message);
      setHasProcessedUpload(true);
      onImageReady(payload);
    },
    [confirmedPreviewUrl, onImageReady],
  );

  const revokeOriginalSource = useCallback(() => {
    setOriginalImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    void (async () => {
      setCompressing(true);
      setOptimizeHint(null);
      setHasProcessedUpload(false);
      revokeOriginalSource();

      const result = await autoCropAndCompressProductImage(file);
      setCompressing(false);

      if (!result.ok) {
        onError?.(result.error);
        onProcessedChange?.(false);
        return;
      }

      setOriginalImageSrc(result.originalUrl);
      setPendingFileName(result.fileName);
      setSavedCropPercentages(result.cropPercentages);
      applyProcessedImage({
        file: result.file,
        previewUrl: result.previewUrl,
        message: result.message,
      });
    })();
  }

  async function openEditDialog() {
    if (!originalImageSrc) return;

    setInitialCropArea(savedCropPercentages);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPercent(null);
    setCroppedAreaPixels(null);
    setCropOpen(true);

    if (savedCropPercentages) {
      try {
        const image = await loadImage(originalImageSrc);
        setCroppedAreaPixels(
          percentCropToPixels(
            savedCropPercentages,
            image.naturalWidth,
            image.naturalHeight,
          ),
        );
        setCroppedAreaPercent(savedCropPercentages);
      } catch {
        // onCropComplete lo establecerá al montar el cropper.
      }
    }
  }

  const closeCropDialog = useCallback(() => {
    setCropOpen(false);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const onCropComplete = useCallback((percent: Area, pixels: Area) => {
    setCroppedAreaPercent(percent);
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSaveCrop() {
    if (!originalImageSrc || !croppedAreaPixels) return;

    setCompressing(true);
    try {
      const croppedBlob = await getCroppedImageBlob(originalImageSrc, croppedAreaPixels);
      const result = await compressSelectedProductImage(croppedBlob, pendingFileName);

      if (!result.ok) {
        onError?.(result.error);
        return;
      }

      if (croppedAreaPercent) {
        setSavedCropPercentages(croppedAreaPercent);
      }

      applyProcessedImage({
        file: result.file,
        previewUrl: result.previewUrl,
        message: result.message,
      });
      closeCropDialog();
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el encuadre. Prueba de nuevo.",
      );
    } finally {
      setCompressing(false);
    }
  }

  const pickButtonLabel = compressing
    ? "Procesando foto…"
    : confirmedPreviewUrl
      ? "Cambiar foto"
      : layout === "compact"
        ? "Tomar foto o galería"
        : "Tomar foto o elegir imagen";

  const previewBlock = confirmedPreviewUrl ? (
    <div
      className={cn(
        `group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm ring-1 ring-zinc-200/60 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-800 ${PRODUCT_IMAGE_ASPECT_CLASS}`,
        layout === "compact" ? "h-full w-full" : "mt-3 w-full max-w-[8.5rem] sm:max-w-[9.5rem]",
        compressing && "opacity-70",
      )}
    >
      <Image
        src={confirmedPreviewUrl}
        alt="Vista previa en catálogo (4:5)"
        fill
        sizes={layout === "compact" ? "64px" : "140px"}
        className="object-cover"
        unoptimized={confirmedPreviewUrl.startsWith("blob:")}
      />
      {compressing && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-zinc-950/70"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-5 w-5 animate-spin text-teal-400" aria-hidden="true" />
          <span className="text-[10px] font-medium text-zinc-200">Procesando…</span>
        </div>
      )}
      {canEditFraming && (
        <button
          type="button"
          onClick={openEditDialog}
          className="absolute bottom-2 right-2 z-10 flex h-8 items-center gap-1 rounded-lg bg-zinc-950/75 px-2 py-1 text-[10px] font-medium text-zinc-100 shadow-lg backdrop-blur-sm transition hover:bg-zinc-900/90"
          aria-label="Editar encuadre"
        >
          <Crop className="h-3.5 w-3.5" aria-hidden="true" />
          Editar
        </button>
      )}
    </div>
  ) : layout === "compact" ? (
    <div
      className={cn(
        `flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 ${PRODUCT_IMAGE_ASPECT_CLASS}`,
        "h-full w-full",
      )}
    >
      <ImagePlus className="h-5 w-5" aria-hidden="true" />
    </div>
  ) : null;

  const controls = (
    <div className={layout === "compact" ? "min-w-0 flex-1" : undefined}>
      {layout === "compact" && (
        <Label htmlFor={id} className="payment-field-label">
          Foto del producto
        </Label>
      )}
      {layout === "stacked" && <p className="label-field">Foto del producto</p>}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={PRODUCT_IMAGE_FILE_ACCEPT}
        capture={PRODUCT_IMAGE_FILE_CAPTURE}
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Tomar foto o elegir imagen del producto"
      />

      {layout === "stacked" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="btn-brand-outline mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-sm sm:w-auto"
        >
          {compressing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          )}
          {pickButtonLabel}
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 inline-flex min-h-10 w-full items-center justify-center gap-2 sm:w-auto"
        >
          {compressing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {pickButtonLabel}
        </Button>
      )}

      <p
        className={cn(
          "text-zinc-500 dark:text-zinc-400",
          layout === "compact" ? "mt-1 text-[11px] leading-snug" : "mt-1 text-xs",
        )}
      >
        {PRODUCT_IMAGE_RECOMMENDED_HINT}. {PRODUCT_IMAGE_CROP_HINT}
      </p>
      <p
        className={cn(
          "text-zinc-400",
          layout === "compact" ? "mt-0.5 text-[10px]" : "mt-0.5 text-[11px]",
        )}
      >
        {PRODUCT_IMAGE_OPTIMIZE_HINT} {PRODUCT_IMAGE_CAMERA_HINT}
        {mode === "edit"
          ? layout === "compact"
            ? " Opcional al editar."
            : " Deja sin cambiar para conservar la imagen actual."
          : ""}
      </p>

      {optimizeHint && (
        <p
          className={cn(
            "text-teal-700 dark:text-teal-400",
            layout === "compact"
              ? "mt-1.5 text-[10px]"
              : "mt-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200",
          )}
        >
          ✓ {optimizeHint}
        </p>
      )}
    </div>
  );

  return (
    <>
      {layout === "compact" ? (
        <div className="flex items-start gap-3">
          <div className="relative w-14 shrink-0">{previewBlock}</div>
          {controls}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {confirmedPreviewUrl && (
            <div className="shrink-0">{previewBlock}</div>
          )}
          <div className="min-w-0 flex-1">{controls}</div>
        </div>
      )}

      <Dialog open={cropOpen} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent
          className="relative max-w-lg overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl"
          onClose={closeCropDialog}
        >
          <div className="border-b border-zinc-800 px-5 py-4">
            <DialogHeader className="mb-0">
              <DialogTitle className="text-base font-semibold text-zinc-50">
                Editar encuadre
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-400">
                Arrastra la imagen o usa zoom para ajustar el recorte 4:5. La foto original completa
                se muestra aquí.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative h-64 w-full bg-black sm:h-72">
            {originalImageSrc && cropOpen && (
              <Cropper
                key={`${originalImageSrc}-${initialCropArea?.x ?? 0}`}
                image={originalImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={PRODUCT_IMAGE_ASPECT_RATIO}
                initialCroppedAreaPercentages={initialCropArea}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                showGrid
                cropShape="rect"
                style={{
                  containerStyle: { background: "#000" },
                  cropAreaStyle: {
                    border: "1px solid rgba(255,255,255,0.35)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  },
                }}
              />
            )}
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-teal-500"
                aria-label="Zoom del encuadre"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800 bg-zinc-950/90 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeCropDialog}
              disabled={compressing}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="btn-brand min-w-[9rem]"
              onClick={handleSaveCrop}
              disabled={compressing || !croppedAreaPixels}
            >
              {compressing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
