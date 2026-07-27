import type { CSSProperties, ReactNode } from "react";
import type { PublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { cn } from "@/lib/cn";

interface StoreWhitelabelRootProps {
  themeContext: PublicCatalogThemeContext | null;
  className?: string;
  children: ReactNode;
}

/** Envuelve vistas públicas de tienda con variables CSS de color whitelabel. */
export function StoreWhitelabelRoot({
  themeContext,
  className,
  children,
}: StoreWhitelabelRootProps) {
  if (!themeContext) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "txn-catalog-root",
        themeContext.rubroClass,
        themeContext.designClasses,
        className,
      )}
      style={themeContext.style as CSSProperties}
    >
      {children}
    </div>
  );
}
