import { cn } from "@/lib/cn";

const BRAND_ISOTYPE_COLORS = {
  default: {
    background: "#059669",
    foreground: "#FFFFFF",
  },
  landing: {
    background: "#047857",
    foreground: "#FFFFFF",
  },
} as const;

const SIZE_CLASS = {
  sm: "brand-isotype-sm",
  md: "brand-isotype-md",
  lg: "brand-isotype-lg",
} as const;

interface BrandIsotypeProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "landing";
  className?: string;
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
    >
      <rect width="40" height="40" rx="7.2" fill={colors.background} />
      <text
        x="20"
        y="21.5"
        fill={colors.foreground}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="17"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        a
      </text>
    </svg>
  );
}
