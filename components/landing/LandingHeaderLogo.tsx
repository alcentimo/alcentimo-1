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

/** Logo único de la landing — PNG nativo, sin filtros ni contenedor. */
export function LandingHeaderLogo({
  href = "/",
  size = "header",
  className,
}: LandingHeaderLogoProps) {
  const imgClass =
    size === "footer" ? "landing-footer-logo-img" : "landing-header-logo-img";

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_FULL_PATH}
      srcSet={`${BRAND_LOGO_FULL_PATH} 1x, ${BRAND_LOGO_FULL_2X_PATH} 2x`}
      width={BRAND_LOGO_FULL_WIDTH}
      height={BRAND_LOGO_FULL_HEIGHT}
      alt="Alcentimo"
      className={imgClass}
      decoding="async"
      fetchPriority="high"
    />
  );

  if (!href) {
    return (
      <span className={cn("inline-flex shrink-0 items-center", className)}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn("landing-header-logo-link inline-flex shrink-0 items-center", className)}
      aria-label="Alcentimo"
    >
      {image}
    </Link>
  );
}
