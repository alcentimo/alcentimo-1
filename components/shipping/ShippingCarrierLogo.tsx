import { Home, Truck } from "lucide-react";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";
import {
  DomesaBrandMark,
  LibertyExpressBrandMark,
  MrwBrandMark,
  TealcaBrandMark,
  ZoomDeliveryBrandMark,
} from "@/components/shipping/CarrierBrandMarks";

interface ShippingCarrierLogoProps {
  carrierKey: ShippingCarrierKey;
  className?: string;
}

function iconSize(className: string): string {
  if (className.includes("h-14") || className.includes("w-14")) return "h-8 w-8";
  if (className.includes("h-12") || className.includes("w-12")) return "h-7 w-7";
  if (className.includes("h-11") || className.includes("w-11")) return "h-6 w-6";
  if (className.includes("h-10") || className.includes("w-10")) return "h-6 w-6";
  if (className.includes("h-9") || className.includes("w-9")) return "h-5 w-5";
  return "h-[58%] w-[58%]";
}

/**
 * Logotipos de encomiendas (SVG con colores oficiales) y entrega local (Lucide).
 *
 * MRW, Tealca, Zoom, Domesa y Liberty Express no existen en react-icons/si;
 * usamos marcas SVG dedicadas en lugar de SiZoom (videoconferencia).
 */
export function ShippingCarrierLogo({
  carrierKey,
  className = "h-10 w-10",
}: ShippingCarrierLogoProps) {
  const size = iconSize(className);

  switch (carrierKey) {
    case "mrw":
      return <MrwBrandMark className={className} />;
    case "tealca":
      return <TealcaBrandMark className={className} />;
    case "zoom":
      return <ZoomDeliveryBrandMark className={className} />;
    case "domesa":
      return <DomesaBrandMark className={className} />;
    case "libertyExpress":
      return <LibertyExpressBrandMark className={className} />;
    case "delivery":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#0D9488]">
          <Truck className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    case "pickup":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#475569]">
          <Home className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    default:
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-zinc-500">
          <span className="text-xs font-bold text-white">?</span>
        </BrandLogoTile>
      );
  }
}
