import { Gift } from "lucide-react";
import { cn } from "@/lib/cn";

interface GiftCardProductArtProps {
  className?: string;
  alt?: string;
}

/** Ilustración elegante cuando la tarjeta de regalo no tiene foto de catálogo. */
export function GiftCardProductArt({
  className,
  alt = "Tarjeta de regalo",
}: GiftCardProductArtProps) {
  return (
    <div
      className={cn("gift-card-product-art", className)}
      role="img"
      aria-label={alt}
    >
      <div className="gift-card-product-art-shine" aria-hidden="true" />
      <div className="gift-card-product-art-body">
        <Gift className="gift-card-product-art-icon" strokeWidth={1.5} />
        <p className="gift-card-product-art-kicker">Digital</p>
        <p className="gift-card-product-art-title">Tarjeta de regalo</p>
      </div>
    </div>
  );
}
