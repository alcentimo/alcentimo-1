export type BrandMarkMode = "isotype" | "full" | "responsive";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  subtitle?: string;
  className?: string;
  centered?: boolean;
  theme?: "light" | "dark";
  variant?: "default" | "landing";
  responsive?: boolean;
  mark?: BrandMarkMode;
  logoUrl?: string | null;
  platformName?: string;
}

/** Reservado: sin logo de marca hasta nuevo asset. */
export function BrandLogo(_props: BrandLogoProps) {
  return null;
}
