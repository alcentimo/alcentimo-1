import Link from "next/link";
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_PATH,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface LandingHeaderLogoProps {
  href?: string;
  className?: string;
}

/** Logo horizontal oficial — PNG transparente, altura fija y ancho automático. */
export function LandingHeaderLogo({
  href = "/",
  className,
}: LandingHeaderLogoProps) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_PATH}
      width={BRAND_LOGO_WIDTH}
      height={BRAND_LOGO_HEIGHT}
      alt="Alcentimo"
      className="block h-10 w-auto max-w-none shrink-0 border-0 bg-transparent object-contain object-left shadow-none outline-none"
      decoding="sync"
      fetchPriority="high"
    />
  );

  if (!href) {
    return (
      <span className={cn("inline-flex max-w-none shrink-0 items-center", className)}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-none shrink-0 items-center border-0 bg-transparent shadow-none outline-none",
        className,
      )}
      aria-label="Alcentimo"
    >
      {image}
    </Link>
  );
}
