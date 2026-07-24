import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

type DashboardProductThumbSize = "sm" | "md";

const SIZE_CLASS: Record<DashboardProductThumbSize, string> = {
  sm: "dashboard-product-thumb--sm",
  md: "dashboard-product-thumb--md",
};

const IMAGE_SIZES: Record<DashboardProductThumbSize, string> = {
  sm: "36px",
  md: "48px",
};

interface DashboardProductThumbProps {
  name: string;
  thumbUrl: string | null;
  size?: DashboardProductThumbSize;
  className?: string;
}

/** Miniatura fija para tablas y listas del panel administrativo. */
export function DashboardProductThumb({
  name,
  thumbUrl,
  size = "sm",
  className,
}: DashboardProductThumbProps) {
  if (thumbUrl) {
    return (
      <div
        className={cn("dashboard-product-thumb", SIZE_CLASS[size], className)}
      >
        <Image
          src={thumbUrl}
          alt={name}
          fill
          sizes={IMAGE_SIZES[size]}
          loading="lazy"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "dashboard-product-thumb dashboard-product-thumb-fallback",
        SIZE_CLASS[size],
        className,
      )}
      role="img"
      aria-label={`Sin imagen: ${name}`}
    >
      <ImageOff
        className={cn(
          "dashboard-product-thumb-fallback-icon",
          size === "md" && "dashboard-product-thumb-fallback-icon--md",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
