"use client";

import { cn } from "@/lib/cn";
import { GIFT_CARD_PUBLIC_IMAGE_PATH } from "@/lib/gift-cards/delivery";

interface GiftCardCorporateVisualProps {
  className?: string;
  alt?: string;
}

/** Diseño corporativo estático: no depende de URLs remotas rotas. */
export function GiftCardCorporateVisual({
  className,
  alt = "Tarjeta de regalo",
}: GiftCardCorporateVisualProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-teal-950",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GIFT_CARD_PUBLIC_IMAGE_PATH}
        alt={alt}
        className="h-full w-full object-cover object-center"
        draggable={false}
      />
    </div>
  );
}
