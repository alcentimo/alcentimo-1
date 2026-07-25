import { cn } from "@/lib/cn";
import { BRAND_ISOTYPE_COLORS } from "@/components/ui/BrandIsotype";

const WORDMARK_COLOR = {
  default: "#18181B",
  landing: "#022C22",
} as const;

const SIZE_CLASS = {
  sm: "brand-logo-full-sm",
  md: "brand-logo-full-md",
  lg: "brand-logo-full-lg",
} as const;

const SVG_CRISP_PROPS = {
  shapeRendering: "geometricPrecision" as const,
  textRendering: "geometricPrecision" as const,
};

interface BrandLogoFullProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "landing";
  platformName?: string;
  className?: string;
}

/** Logo horizontal completo: isotipo + wordmark (SVG vectorial). */
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
  const isotypeColors = BRAND_ISOTYPE_COLORS[variant];

  return (
    <svg
      className={cn("brand-logo-full shrink-0", SIZE_CLASS[size], className)}
      viewBox="0 0 176 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={wordmark}
      {...SVG_CRISP_PROPS}
    >
      <rect width="40" height="40" rx="7.2" fill={isotypeColors.background} />
      <text
        x="17.5"
        y="22"
        fill={isotypeColors.foreground}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="16"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        a
      </text>
      <text
        x="27.5"
        y="24.5"
        fill={isotypeColors.accent}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        ¢
      </text>
      <path
        d="M27.5 9.5 31.5 13.5M31.5 13.5 27.5 13.5M31.5 13.5 31.5 9.5"
        stroke={isotypeColors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="48"
        y="20"
        fill={wordmarkColor}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="-0.02em"
        dominantBaseline="middle"
      >
        {displayName}
      </text>
    </svg>
  );
}
