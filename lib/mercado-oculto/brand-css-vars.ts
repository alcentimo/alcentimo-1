import type { CSSProperties } from "react";
import {
  darkenHex,
  getAccessibleForeground,
  normalizeHex6,
} from "@/lib/store-settings/color-contrast";

const DEFAULT_PRIMARY = "#0e5c42";

/**
 * Remapea tokens Moriche (`--mo-*`) al color principal de una tienda.
 * La barra superior usa el color de marca a pleno (estilo marketplace).
 */
export function buildMercadoBrandCssVars(
  primaryColor: string | null | undefined,
): CSSProperties {
  const primary =
    normalizeHex6(primaryColor?.trim() || DEFAULT_PRIMARY) ?? DEFAULT_PRIMARY;
  const headerFg = getAccessibleForeground(primary);
  const hover = darkenHex(primary, 0.12);
  const deep = darkenHex(primary, 0.22);

  return {
    ["--mo-emerald"]: primary,
    ["--mo-emerald-hover"]: hover,
    ["--mo-emerald-soft"]: `color-mix(in srgb, ${primary} 14%, white)`,
    ["--mo-forest"]: primary,
    ["--mo-forest-deep"]: deep,
    ["--mo-header-fg"]: headerFg,
    ["--mo-warm"]: `color-mix(in srgb, ${primary} 28%, #c4a574)`,
    ["--mo-warm-soft"]: `color-mix(in srgb, ${primary} 10%, #f4ebe1)`,
    ["--mo-gold"]: `color-mix(in srgb, ${primary} 22%, #9a7b4f)`,
    ["--mo-page"]: "#ebebeb",
    ["--sf-brand"]: primary,
    ["--txn-primary"]: primary,
  } as CSSProperties;
}
