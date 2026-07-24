import type { PaymentMethodKey } from "@/lib/store-settings/types";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";
import {
  BinanceBrandMark,
  CasheaBrandMark,
  CryptoBrandMark,
  EfectivoUsdBrandMark,
  PagoMovilBrandMark,
  PaypalBrandMark,
  PuntoVentaBrandMark,
  TransferenciaBrandMark,
  ZelleBrandMark,
} from "@/components/payments/PaymentBrandMarks";

interface PaymentMethodLogoProps {
  methodKey: PaymentMethodKey;
  className?: string;
}

/** Logotipos de métodos de pago (marcas oficiales con colores corporativos). */
export function PaymentMethodLogo({
  methodKey,
  className = "h-10 w-10",
}: PaymentMethodLogoProps) {
  switch (methodKey) {
    case "zelle":
      return <ZelleBrandMark className={className} />;
    case "cashea":
      return <CasheaBrandMark className={className} />;
    case "pagoMovil":
      return <PagoMovilBrandMark className={className} />;
    case "transferencia":
      return <TransferenciaBrandMark className={className} />;
    case "efectivoUsd":
      return <EfectivoUsdBrandMark className={className} />;
    case "puntoVenta":
      return <PuntoVentaBrandMark className={className} />;
    case "paypal":
      return <PaypalBrandMark className={className} />;
    case "binance":
      return <BinanceBrandMark className={className} />;
    case "crypto":
      return <CryptoBrandMark className={className} />;
    default:
      return (
        <BrandLogoTile className={className} backgroundClassName="bg-zinc-500">
          <span className="text-xs font-bold text-white">?</span>
        </BrandLogoTile>
      );
  }
}
