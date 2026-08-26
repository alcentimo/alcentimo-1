import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

interface SupplierPayoutProofPreviewProps {
  url: string;
  className?: string;
  label?: string;
}

export function SupplierPayoutProofPreview({
  url,
  className,
  label = "Ver capture de pago",
}: SupplierPayoutProofPreviewProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 flex max-w-sm items-center gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30",
        className,
      )}
    >
      <span className="relative block h-24 w-24 shrink-0 bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={url}
          alt="Comprobante de pago de Alcéntimo"
          fill
          sizes="96px"
          className="object-cover"
          unoptimized
        />
      </span>
      <span className="inline-flex items-center gap-1 pr-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
        {label}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}
