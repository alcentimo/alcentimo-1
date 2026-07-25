import { cn } from "@/lib/cn";

export const BRAND_ISOTYPE_COLORS = {
  default: {
    background: "#059669",
    foreground: "#FFFFFF",
    accent: "#FFFFFF",
  },
  landing: {
    background: "#047857",
    foreground: "#FFFFFF",
    accent: "#FFFFFF",
  },
} as const;

const SIZE_CLASS = {
  sm: "brand-isotype-sm",
  md: "brand-isotype-md",
  lg: "brand-isotype-lg",
} as const;

const SVG_CRISP_PROPS = {
  shapeRendering: "geometricPrecision" as const,
  textRendering: "geometricPrecision" as const,
};

interface BrandIsotypeProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "landing";
  className?: string;
}

function IsotypeGraphic({
  colors,
}: {
  colors: (typeof BRAND_ISOTYPE_COLORS)[keyof typeof BRAND_ISOTYPE_COLORS];
}) {
  return (
    <>
      <rect width="40" height="40" rx="7.2" fill={colors.background} />
      <text
        x="17.5"
        y="22"
        fill={colors.foreground}
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
        fill={colors.accent}
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
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Isotipo vectorial de Alcentimo — nítido en cualquier densidad de pantalla. */
export function BrandIsotype({
  size = "md",
  variant = "default",
  className,
}: BrandIsotypeProps) {
  const colors = BRAND_ISOTYPE_COLORS[variant];

  return (
    <svg
      className={cn("brand-isotype shrink-0", SIZE_CLASS[size], className)}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      {...SVG_CRISP_PROPS}
    >
      <IsotypeGraphic colors={colors} />
    </svg>
  );
}

export function BrandIsotypeGraphic({
  variant = "default",
}: {
  variant?: "default" | "landing";
}) {
  return <IsotypeGraphic colors={BRAND_ISOTYPE_COLORS[variant]} />;
}
