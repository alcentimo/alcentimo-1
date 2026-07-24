import { BrandLogoTile } from "@/components/ui/BrandLogoTile";

interface CarrierMarkProps {
  className?: string;
}

function CarrierLogoImage({
  src,
  alt,
  className = "h-11 w-11",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <BrandLogoTile className={className} backgroundClassName="bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- logos locales ya optimizados a 256px */}
      <img
        src={src}
        alt={alt}
        width={88}
        height={88}
        className="h-[86%] w-[86%] object-contain"
        draggable={false}
        decoding="async"
      />
    </BrandLogoTile>
  );
}

/** MRW — logotipo oficial (navy + acento rojo). */
export function MrwBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <CarrierLogoImage
      src="/images/shipping/mrw.png"
      alt="MRW"
      className={className}
    />
  );
}

/** Tealca — águila azul + wordmark oficial. */
export function TealcaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <CarrierLogoImage
      src="/images/shipping/tealca.png"
      alt="Tealca"
      className={className}
    />
  );
}

/** Zoom Encomiendas Venezuela — wordmark azul + canguro. No confundir con SiZoom. */
export function ZoomDeliveryBrandMark({
  className = "h-11 w-11",
}: CarrierMarkProps) {
  return (
    <CarrierLogoImage
      src="/images/shipping/zoom.png"
      alt="Zoom"
      className={className}
    />
  );
}

/** Domesa — emblema circular oficial (águila). */
export function DomesaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <CarrierLogoImage
      src="/images/shipping/domesa.png"
      alt="Domesa"
      className={className}
    />
  );
}

/** Liberty Express — wordmark oficial con avión y olas. */
export function LibertyExpressBrandMark({
  className = "h-11 w-11",
}: CarrierMarkProps) {
  return (
    <CarrierLogoImage
      src="/images/shipping/liberty-express.png"
      alt="Liberty Express"
      className={className}
    />
  );
}
