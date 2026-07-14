"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ImagePlus, Loader2, Move } from "lucide-react";
import "react-easy-crop/react-easy-crop.css";
import {
  PRODUCT_IMAGE_ASPECT_CLASS,
  PRODUCT_IMAGE_CROP_HINT,
  PRODUCT_IMAGE_OPTIMIZE_HINT,
  PRODUCT_IMAGE_RECOMMENDED_HINT,
} from "@/lib/product-image";
import {
  compressSelectedProductImage,
  PRODUCT_IMAGE_CAMERA_HINT,
  PRODUCT_IMAGE_FILE_ACCEPT,
  PRODUCT_IMAGE_FILE_CAPTURE,
  revokeProductImagePreview,
} from "@/lib/product-image-picker";
import {
  getCenteredCropAreaPercentages,
  getCroppedImageBlob,
  loadImage,
  PRODUCT_IMAGE_ASPECT_RATIO,
  readFileAsObjectUrl,
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
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmedPreviewUrl, setConfirmedPreviewUrl] = useState<string | null>(
    initialPreviewUrl,
  );
  const [optimizeHint, setOptimizeHint] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("producto.jpg");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [initialCropArea, setInitialCropArea] = useState<Area | undefined>();
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);

  const isBusy = compressing || disabled;

  useEffect(() => {
    onBusyChange?.(compressing);
  }, [compressing, onBusyChange]);

  useEffect(() => {
    return () => revokeProductImagePreview(confirmedPreviewUrl);
  }, [confirmedPreviewUrl]);

  useEffect(() => {
    return () => revokeProductImagePreview(livePreviewUrl);
  }, [livePreviewUrl]);

  useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

  const closeCropDialog = useCallback(() => {
    setCropOpen(false);
    setCropImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCroppedAreaPixels(null);
    setInitialCropArea(undefined);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setLivePreviewUrl((prev) => {
      revokeProductImagePreview(prev);
      return null;
    });
  }, []);

  const updateLivePreview = useCallback(
    async (pixels: Area) => {
      if (!cropImageSrc) return;
      try {
        const blob = await getCroppedImageBlob(cropImageSrc, pixels);
        const url = URL.createObjectURL(blob);
        setLivePreviewUrl((prev) => {
          revokeProductImagePreview(prev);
          return url;
        });
      } catch {
        // La previsualización en vivo es opcional; el recorte final valida en confirmar.
      }
    },
    [cropImageSrc],
  );

  const onCropComplete = useCallback(
    (_: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
      void updateLivePreview(pixels);
    },
    [updateLivePreview],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    void (async () => {
      try {
        const objectUrl = readFileAsObjectUrl(file);
        const image = await loadImage(objectUrl);
        const centered = getCenteredCropAreaPercentages(
          image.naturalWidth,
          image.naturalHeight,
        );

        setPendingFileName(file.name);
        setInitialCropArea(centered);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        revokeProductImagePreview(livePreviewUrl);
        setLivePreviewUrl(null);
        setCropImageSrc(objectUrl);
        setCropOpen(true);
      } catch {
        onError?.("No se pudo abrir la imagen. Prueba con otra foto.");
      }
    })();
  }

  async function handleConfirmCrop() {
    if (!cropImageSrc || !croppedAreaPixels) return;

    setCompressing(true);
    try {
      const croppedBlob = await getCroppedImageBlob(cropImageSrc, croppedAreaPixels);
      const result = await compressSelectedProductImage(croppedBlob, pendingFileName);

      if (!result.ok) {
        onError?.(result.error);
        return;
      }

      revokeProductImagePreview(confirmedPreviewUrl);
      setConfirmedPreviewUrl(result.previewUrl);
      setOptimizeHint(result.message);
      onImageReady({
        file: result.file,
        previewUrl: result.previewUrl,
        message: result.message,
      });
      closeCropDialog();
    } catch (error) {
      onError?.(
        error instanceof Error
          ? error.message
          : "No se pudo procesar la imagen. Prueba con otra foto.",
      );
    } finally {
      setCompressing(false);
    }
  }

  const pickButtonLabel = compressing
    ? "Optimizando…"
    : confirmedPreviewUrl
      ? "Cambiar foto"
      : layout === "compact"
        ? "Tomar foto o galería"
        : "Tomar foto o elegir imagen";

  const previewBlock = confirmedPreviewUrl ? (
    <div
      className={cn(
        `relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 ${PRODUCT_IMAGE_ASPECT_CLASS}`,
        layout === "compact" ? "h-full w-full" : "mt-3 w-full max-w-[7rem] sm:max-w-[8.5rem]",
        compressing && "opacity-70",
      )}
    >
      <Image
        src={confirmedPreviewUrl}
        alt="Vista previa en catálogo"
        fill
        sizes={layout === "compact" ? "64px" : "120px"}
        className="object-cover"
        unoptimized={confirmedPreviewUrl.startsWith("blob:")}
      />
      {compressing && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/75 dark:bg-zinc-950/75"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
          <span className="text-[9px] font-medium text-teal-700 dark:text-teal-300">
            Optimizando…
          </span>
        </div>
      )}
    </div>
  ) : layout === "compact" ? (
    <div
      className={cn(
        `flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 ${PRODUCT_IMAGE_ASPECT_CLASS}`,
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
          layout === "compact"
            ? "mt-1 text-[11px] leading-snug"
            : "mt-1 text-xs",
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
        {mode === "edit" ? (layout === "compact" ? " Opcional al editar." : " Deja sin cambiar para conservar la imagen actual.") : ""}
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
          {layout === "compact" ? `✓ ${optimizeHint}` : `✓ ${optimizeHint}`}
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
        <div>
          {controls}
          {previewBlock}
        </div>
      )}

      <Dialog open={cropOpen} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent className="relative overflow-hidden p-0" onClose={closeCropDialog}>
          <div className="p-5 pb-0">
            <DialogHeader>
              <DialogTitle>Vista previa de la foto</DialogTitle>
              <DialogDescription>
                Recorte automático al centro (4:5). Arrastra o haz zoom solo si quieres ajustar el
                encuadre.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative h-56 w-full bg-zinc-900 sm:h-64">
            {cropImageSrc && (
              <Cropper
                key={cropImageSrc}
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={PRODUCT_IMAGE_ASPECT_RATIO}
                initialCroppedAreaPercentages={initialCropArea}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="cover"
                showGrid={false}
              />
            )}
          </div>

          <div className="space-y-3 px-5 pt-4">
            <div className="flex items-center gap-2">
              <Move className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-teal-600"
                aria-label="Zoom del encuadre"
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div
                className={`relative w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 ${PRODUCT_IMAGE_ASPECT_CLASS}`}
              >
                {livePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={livePreviewUrl}
                    alt="Así se verá en el catálogo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                    …
                  </div>
                )}
              </div>
              <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Así se verá en tu catálogo.
                </span>{" "}
                Las fotos horizontales ya vienen centradas; no necesitas editar nada.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={closeCropDialog} disabled={compressing}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="btn-brand min-w-[8.5rem]"
              onClick={handleConfirmCrop}
              disabled={compressing || !croppedAreaPixels}
            >
              {compressing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Optimizando…
                </>
              ) : (
                "Usar esta foto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
