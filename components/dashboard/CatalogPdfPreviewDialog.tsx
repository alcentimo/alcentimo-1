"use client";

import { useEffect } from "react";
import { Download, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  downloadPdfFile,
  openPdfPreviewInNewTab,
  revokePdfPreviewUrl,
} from "@/lib/products/download-export";

interface CatalogPdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  fileBase64: string | null;
  fileName: string | null;
}

export function CatalogPdfPreviewDialog({
  open,
  onOpenChange,
  previewUrl,
  fileBase64,
  fileName,
}: CatalogPdfPreviewDialogProps) {
  useEffect(() => {
    if (!open && previewUrl) {
      revokePdfPreviewUrl(previewUrl);
    }
  }, [open, previewUrl]);

  function handleClose() {
    onOpenChange(false);
  }

  function handleDownload() {
    if (!fileBase64 || !fileName) return;
    downloadPdfFile(fileBase64, fileName);
  }

  function handleOpenNewTab() {
    if (!previewUrl) return;
    openPdfPreviewInNewTab(previewUrl);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} containerClassName="max-w-5xl">
      <DialogContent
        className="relative flex max-h-[92dvh] flex-col overflow-hidden p-0"
        onClose={handleClose}
      >
        <DialogHeader className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <DialogTitle>Vista previa del catálogo</DialogTitle>
          <DialogDescription>
            {fileName
              ? `Revisa el PDF antes de descargarlo · ${fileName}`
              : "Revisa el PDF antes de descargarlo."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-zinc-100 dark:bg-zinc-900">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Vista previa del catálogo PDF"
              className="h-[min(68dvh,720px)] w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-[min(68dvh,720px)] items-center justify-center text-sm text-zinc-500">
              No se pudo cargar la vista previa.
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenNewTab}
            disabled={!previewUrl}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Nueva pestaña
          </Button>
          <Button
            type="button"
            className="btn-brand gap-2"
            onClick={handleDownload}
            disabled={!fileBase64 || !fileName}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
