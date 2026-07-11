import {
  SiFacebook,
  SiInstagram,
  SiMercadopago,
  SiMessenger,
  SiWhatsapp,
} from "react-icons/si";
import type { ChannelProviderKey } from "@/src/config/channel-integrations";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";

interface ChannelLogoProps {
  provider: ChannelProviderKey | "facebook";
  className?: string;
}

function iconSize(className: string): string {
  if (className.includes("h-14") || className.includes("w-14")) return "h-8 w-8";
  if (className.includes("h-12") || className.includes("w-12")) return "h-7 w-7";
  if (className.includes("h-11") || className.includes("w-11")) return "h-6 w-6";
  if (className.includes("h-9") || className.includes("w-9")) return "h-5 w-5";
  return "h-[58%] w-[58%]";
}

/** Logotipos oficiales de canales (Simple Icons / react-icons). */
export function ChannelLogo({
  provider,
  className = "h-11 w-11",
}: ChannelLogoProps) {
  const size = iconSize(className);

  switch (provider) {
    case "whatsapp":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#25D366]">
          <SiWhatsapp className={`${size} text-white`} />
        </BrandLogoTile>
      );
    case "instagram":
      return (
        <BrandLogoTile
          className={className}
          backgroundClassName="bg-linear-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
        >
          <SiInstagram className={`${size} text-white`} />
        </BrandLogoTile>
      );
    case "messenger":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#0866FF]">
          <SiMessenger className={`${size} text-white`} />
        </BrandLogoTile>
      );
    case "facebook":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#1877F2]">
          <SiFacebook className={`${size} text-white`} />
        </BrandLogoTile>
      );
    case "mercadolibre":
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-[#FFE600]">
          <SiMercadopago className={`${size} text-[#2D3277]`} />
        </BrandLogoTile>
      );
  }
}
