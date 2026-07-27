import Link from "next/link";
import { BRAND_LOGO_FULL_PATH } from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface LandingHeaderLogoProps {
  href?: string;
  size?: "header" | "footer";
  className?: string;
}

/** Logo único de la landing — solo PNG completo, sin isotipo duplicado. */
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
      className={cn(imgClass, "block bg-transparent object-contain object-left")}
      decoding="async"
    />
  );

  if (!href) {
    return (
      <span className={cn("landing-header-brand inline-flex shrink-0 items-center", className)}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "landing-header-brand inline-flex shrink-0 items-center bg-transparent p-0 shadow-none ring-0",
        className,
      )}
      aria-label="Alcentimo"
    >
      {image}
    </Link>
  );
}
