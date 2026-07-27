import Link from "next/link";
import { BRAND_LOGO_FULL_PATH } from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface LandingHeaderLogoProps {
  href?: string;
  size?: "header" | "footer";
  className?: string;
}

/** Logo único de la landing — PNG recortado, sin contenedor ni fondo. */
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
      alt="Alcentimo"
      className={imgClass}
      decoding="async"
    />
  );

  if (!href) {
    return <span className={cn("inline-flex shrink-0 items-center", className)}>{image}</span>;
  }

  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label="Alcentimo">
      {image}
    </Link>
  );
}
