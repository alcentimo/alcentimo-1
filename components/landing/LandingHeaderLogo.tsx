import Link from "next/link";
import {
  BRAND_LOGO_FULL_2X_PATH,
  BRAND_LOGO_FULL_HEIGHT,
  BRAND_LOGO_FULL_PATH,
  BRAND_LOGO_FULL_WIDTH,
} from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface LandingHeaderLogoProps {
  href?: string;
  size?: "header" | "footer";
  className?: string;
}

const logoImgClass = {
  header: "h-10 w-auto md:h-11",
  footer: "h-7 w-auto md:h-8",
} as const;

/** Logo horizontal de la landing — PNG HD con srcSet 2x y renderizado nítido. */
export function LandingHeaderLogo({
  href = "/",
  size = "header",
  className,
}: LandingHeaderLogoProps) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_FULL_2X_PATH}
      srcSet={`${BRAND_LOGO_FULL_PATH} 1x, ${BRAND_LOGO_FULL_2X_PATH} 2x`}
      width={BRAND_LOGO_FULL_WIDTH}
      height={BRAND_LOGO_FULL_HEIGHT}
      alt="Alcentimo"
      className={cn(
        "brand-logo-sharp block max-w-none shrink-0 border-0 bg-transparent object-contain object-left shadow-none outline-none",
        logoImgClass[size],
      )}
      decoding="async"
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
