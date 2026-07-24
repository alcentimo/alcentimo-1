const HEX6 = /^#([0-9a-fA-F]{6})$/;

export function normalizeHex6(hex: string): string | null {
  const trimmed = hex.trim();
  if (!HEX6.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex6(hex);
  if (!normalized) return null;

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function srgbChannel(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa WCAG (0–1). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  return (
    0.2126 * srgbChannel(rgb.r) +
    0.7152 * srgbChannel(rgb.g) +
    0.0722 * srgbChannel(rgb.b)
  );
}

/** Texto legible sobre un fondo de color sólido. */
export function getAccessibleForeground(
  backgroundHex: string,
): "#ffffff" | "#0a0a0a" {
  return relativeLuminance(backgroundHex) > 0.45 ? "#0a0a0a" : "#ffffff";
}

export function mixHexColors(
  hex1: string,
  hex2: string,
  weightHex1: number,
): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return hex1;

  const weight = Math.min(1, Math.max(0, weightHex1));
  const mix = (c1: number, c2: number) =>
    Math.round(c1 * weight + c2 * (1 - weight));

  const r = mix(a.r, b.r);
  const g = mix(a.g, b.g);
  const bl = mix(a.b, b.b);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function darkenHex(hex: string, amount: number): string {
  return mixHexColors(hex, "#000000", 1 - amount);
}

export function lightenHex(hex: string, amount: number): string {
  return mixHexColors(hex, "#ffffff", 1 - amount);
}
