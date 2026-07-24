"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getCameraErrorMessage } from "@/lib/product-camera";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductCameraCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onError: (message: string) => void;
}

export function ProductCameraCaptureDialog({
  open,
  onClose,
  onCapture,
  onError,
}: ProductCameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;
    setStarting(true);

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch (error) {
        if (!cancelled) {
          onError(getCameraErrorMessage(error));
          onClose();
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [onClose, onError, open, stopStream]);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      onError("La cámara aún no está lista. Espera un momento e inténtalo de nuevo.");
      return;
    }

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        onError("No se pudo capturar la foto.");
        return;
      }

      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        onError("No se pudo capturar la foto.");
        return;
      }

      onCapture(
        new File([blob], `camara-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
      onClose();
    } catch (error) {
      onError(getCameraErrorMessage(error));
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden p-0" onClose={onClose}>
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Tomar foto</DialogTitle>
          <DialogDescription>
            Encuadra el producto y pulsa capturar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
              <Loader2 className="h-8 w-8 animate-spin text-teal-400" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={capturing}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="btn-brand"
            onClick={() => void handleCapture()}
            disabled={starting || capturing}
          >
            {capturing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Capturando…
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Capturar foto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
