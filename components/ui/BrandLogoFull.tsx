import { cn } from "@/lib/cn";
import { BrandIsotypeGraphic } from "@/components/ui/BrandIsotype";

const WORDMARK_COLOR = {
  default: "#18181B",
  landing: "#022C22",
} as const;

const SIZE_CLASS = {
  sm: "brand-logo-full-sm",
  md: "brand-logo-full-md",
  lg: "brand-logo-full-lg",
} as const;

interface BrandLogoFullProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "landing";
  platformName?: string;
  className?: string;
}

/** Logo horizontal completo: isotipo + wordmark. */
export function BrandLogoFull({
  size = "md",
  variant = "default",
  platformName = "Alcentimo",
  className,
}: BrandLogoFullProps) {
  const wordmark = platformName.trim() || "Alcentimo";
  const displayName =
    variant === "landing" ? wordmark : wordmark.toLowerCase();
  const wordmarkColor = WORDMARK_COLOR[variant];

  return (
    <svg
      className={cn("brand-logo-full shrink-0", SIZE_CLASS[size], className)}
      viewBox="0 0 176 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={wordmark}
    >
      <g>
        <BrandIsotypeGraphic variant={variant} />
      </g>
      <text
        x="48"
        y="25"
        fill={wordmarkColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="-0.02em"
      >
        {displayName}
      </text>
    </svg>
  );
}
