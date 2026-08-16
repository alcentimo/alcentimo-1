import type { CSSProperties } from "react";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";

const DEFAULT_PRIMARY = "#0e5c42";

/**
 * Remapea tokens Moriche (`--mo-*`) al color principal de una tienda.
 * Conserva la estructura visual; solo cambia el tinte de marca.
 */
export function buildMercadoBrandCssVars(
  primaryColor: string | null | undefined,
): CSSProperties {
  const primary =
    normalizeHex6(primaryColor?.trim() || DEFAULT_PRIMARY) ?? DEFAULT_PRIMARY;

  return {
    ["--mo-emerald"]: primary,
    ["--mo-emerald-hover"]: `color-mix(in srgb, ${primary} 82%, black)`,
    ["--mo-emerald-soft"]: `color-mix(in srgb, ${primary} 14%, white)`,
    ["--mo-forest"]: `color-mix(in srgb, ${primary} 72%, #031812)`,
    ["--mo-forest-deep"]: `color-mix(in srgb, ${primary} 55%, #02100c)`,
    ["--mo-warm"]: `color-mix(in srgb, ${primary} 35%, #c4a574)`,
    ["--mo-warm-soft"]: `color-mix(in srgb, ${primary} 12%, #f4ebe1)`,
    ["--mo-gold"]: `color-mix(in srgb, ${primary} 28%, #9a7b4f)`,
    ["--mo-page"]: `color-mix(in srgb, ${primary} 6%, #eef3f0)`,
    ["--sf-brand"]: primary,
    ["--txn-primary"]: primary,
  } as CSSProperties;
}
