"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { attachOrderPaymentProof } from "@/lib/orders/actions";
import { checkoutFileInputClass } from "@/components/catalog-transactional/CheckoutFieldFeedback";

interface CustomerOrderPaymentProofUploadProps {
  storeSlug: string;
  orderId: string;
  onUploaded: (result: {
    paymentProofUrl: string;
    estado: "pendiente";
  }) => void;
  className?: string;
  /** Texto de apoyo bajo el input. */
  hint?: string;
}

export function CustomerOrderPaymentProofUpload({
  storeSlug,
  orderId,
  onUploaded,
  className,
  hint = "JPG, PNG, WebP o GIF. Máx. 5 MB.",
}: CustomerOrderPaymentProofUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  function handleProofSelected(file: File | null) {
    setUploadError(null);
    if (!file) return;

    startUploadTransition(async () => {
      const result = await attachOrderPaymentProof({
        storeSlug,
        orderId,
        proof: file,
      });

      if (!result.ok) {
        setUploadError(result.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      onUploaded({
        paymentProofUrl: result.paymentProofUrl,
        estado: result.estado,
      });
    });
  }

  return (
    <div className={className ?? "mt-3 space-y-2"}>
      <label className="txn-field !mb-0">
        <span className="sr-only">Subir comprobante de pago</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={isUploading}
          onChange={(event) => {
            handleProofSelected(event.target.files?.[0] ?? null);
          }}
          aria-invalid={Boolean(uploadError)}
          aria-describedby={
            uploadError
              ? `proof-upload-error-${orderId}`
              : `proof-upload-hint-${orderId}`
          }
          className={checkoutFileInputClass(Boolean(uploadError))}
        />
      </label>
      <p
        id={`proof-upload-hint-${orderId}`}
        className="flex items-start gap-1.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400"
      >
        <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{isUploading ? "Subiendo comprobante…" : hint}</span>
      </p>
      {uploadError ? (
        <p
          id={`proof-upload-error-${orderId}`}
          className="text-[11px] font-medium text-red-600 dark:text-red-400"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
