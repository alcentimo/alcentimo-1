import Link from "next/link";
import { BRAND_LOGO_FULL_PATH } from "@/lib/brand/assets";
import { cn } from "@/lib/cn";

interface LandingHeaderLogoProps {
  href?: string;
  size?: "header" | "footer";
  className?: string;
}

const logoImgClass = {
  header: "h-8 w-auto md:h-9",
  footer: "h-7 w-auto md:h-8",
} as const;

/** Logo horizontal de la landing — altura fija, ancho automático (proporción nativa). */
export function LandingHeaderLogo({
  href = "/",
  size = "header",
  className,
}: LandingHeaderLogoProps) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_FULL_PATH}
      alt="Alcentimo"
      className={cn(
        "block max-w-none shrink-0 border-0 bg-transparent object-contain object-left shadow-none outline-none",
        logoImgClass[size],
      )}
      decoding="async"
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
      className={cn(
        "inline-flex shrink-0 items-center border-0 bg-transparent shadow-none outline-none",
        className,
      )}
      aria-label="Alcentimo"
    >
      {image}
    </Link>
  );
}
