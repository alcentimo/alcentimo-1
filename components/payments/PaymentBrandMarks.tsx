import { BrandLogoTile } from "@/components/ui/BrandLogoTile";

interface PaymentMarkProps {
  className?: string;
}

function PaymentLogoImage({
  src,
  alt,
  className = "h-10 w-10",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <BrandLogoTile className={className} backgroundClassName="bg-transparent">
      {/* eslint-disable-next-line @next/next/no-img-element -- logos locales ya optimizados a 256px */}
      <img
        src={src}
        alt={alt}
        width={88}
        height={88}
        className="h-full w-full object-cover"
        draggable={false}
        decoding="async"
      />
    </BrandLogoTile>
  );
}

/** Pago Móvil — azul bancario + check de confirmación. */
export function PagoMovilBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/pago-movil.png"
      alt="Pago Móvil"
      className={className}
    />
  );
}

/** Transferencia bancaria — edificio bancario azul. */
export function TransferenciaBrandMark({
  className = "h-10 w-10",
}: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/transferencia.png"
      alt="Transferencia bancaria"
      className={className}
    />
  );
}

/** Zelle — marca oficial púrpura. */
export function ZelleBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/zelle.png"
      alt="Zelle"
      className={className}
    />
  );
}

/** Binance Pay — marca oficial amarilla. */
export function BinanceBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/binance.png"
      alt="Binance Pay"
      className={className}
    />
  );
}

/** Criptomonedas — Bitcoin (marca naranja oficial). */
export function CryptoBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/bitcoin.png"
      alt="Criptomonedas"
      className={className}
    />
  );
}

/** Cashea — wordmark oficial sobre amarillo corporativo. */
export function CasheaBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/cashea.png"
      alt="Cashea"
      className={className}
    />
  );
}

/** Punto de venta — terminal POS. */
export function PuntoVentaBrandMark({
  className = "h-10 w-10",
}: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/punto-venta.png"
      alt="Punto de venta"
      className={className}
    />
  );
}

/** Efectivo USD — billete con símbolo $. */
export function EfectivoUsdBrandMark({
  className = "h-10 w-10",
}: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/efectivo-usd.png"
      alt="Efectivo USD"
      className={className}
    />
  );
}

/** PayPal — marca oficial azul. */
export function PaypalBrandMark({ className = "h-10 w-10" }: PaymentMarkProps) {
  return (
    <PaymentLogoImage
      src="/images/payments/paypal.png"
      alt="PayPal"
      className={className}
    />
  );
}
