import { Store, Truck } from "lucide-react";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";

interface ShippingCarrierLogoProps {
  carrierKey: ShippingCarrierKey;
  className?: string;
}

function iconSize(className: string): string {
  if (className.includes("h-11") || className.includes("w-11")) return "h-6 w-6";
  if (className.includes("h-9") || className.includes("w-9")) return "h-5 w-5";
  return "h-[58%] w-[58%]";
}

/** Logotipos de transportistas y métodos de envío (colores oficiales de marca). */
export function ShippingCarrierLogo({
  carrierKey,
  className = "h-10 w-10",
}: ShippingCarrierLogoProps) {
  const size = iconSize(className);

  switch (carrierKey) {
    case "mrw":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#E30613]">
          <span className="text-[11px] font-bold uppercase tracking-tight text-white">
            MRW
          </span>
        </BrandLogoTile>
      );
    case "tealca":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#0054A6]">
          <span className="px-0.5 text-[8px] font-bold uppercase tracking-tight text-white">
            Tealca
          </span>
        </BrandLogoTile>
      );
    case "zoom":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#F7941D]">
          <span className="px-0.5 text-[10px] font-bold uppercase tracking-tight text-zinc-900">
            ZOOM
          </span>
        </BrandLogoTile>
      );
    case "domesa":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#006B3F]">
          <span className="px-0.5 text-[8px] font-bold uppercase tracking-tight text-white">
            Domesa
          </span>
        </BrandLogoTile>
      );
    case "libertyExpress":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#6B21A8]">
          <span className="flex flex-col items-center leading-none text-white">
            <span className="text-[7px] font-bold tracking-wide">LIBERTY</span>
            <span className="mt-0.5 text-[6px] font-semibold text-violet-200">
              EXPRESS
            </span>
          </span>
        </BrandLogoTile>
      );
    case "delivery":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#0D9488]">
          <Truck className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    case "pickup":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#475569]">
          <Store className={`${size} text-white`} strokeWidth={2.25} />
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
