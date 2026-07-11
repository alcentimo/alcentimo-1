import { Banknote, Building2, CreditCard, Smartphone } from "lucide-react";
import { SiZelle } from "react-icons/si";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";

interface PaymentMethodLogoProps {
  methodKey: PaymentMethodKey;
  className?: string;
}

function iconSize(className: string): string {
  if (className.includes("h-11") || className.includes("w-11")) return "h-6 w-6";
  if (className.includes("h-9") || className.includes("w-9")) return "h-5 w-5";
  return "h-[58%] w-[58%]";
}

/** Logotipos de métodos de pago (marcas oficiales + iconografía consistente). */
export function PaymentMethodLogo({
  methodKey,
  className = "h-10 w-10",
}: PaymentMethodLogoProps) {
  const size = iconSize(className);

  switch (methodKey) {
    case "zelle":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#6D1ED4]">
          <SiZelle className={`${size} text-white`} />
        </BrandLogoTile>
      );
    case "cashea":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#F59E0B]">
          <span className="px-1 text-[9px] font-bold uppercase tracking-tight text-zinc-900">
            cashea
          </span>
        </BrandLogoTile>
      );
    case "pagoMovil":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#1D4ED8]">
          <Smartphone className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    case "transferencia":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#0F766E]">
          <Building2 className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    case "efectivoUsd":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#15803D]">
          <Banknote className={`${size} text-white`} strokeWidth={2.25} />
        </BrandLogoTile>
      );
    case "puntoVenta":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#334155]">
          <CreditCard className={`${size} text-white`} strokeWidth={2.25} />
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
