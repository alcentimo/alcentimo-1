import type { ReactNode } from "react";

interface BrandLogoTileProps {
  children: ReactNode;
  className?: string;
  backgroundClassName?: string;
}

/** Contenedor uniforme para logotipos de marcas en tarjetas del dashboard. */
export function BrandLogoTile({
  children,
  className = "h-10 w-10",
  backgroundClassName = "bg-white",
}: BrandLogoTileProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${backgroundClassName} ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
