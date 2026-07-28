import {
  STORE_LOGO_ALLOWED_MIME_TYPES,
  STORE_LOGO_ASPECT_TOLERANCE,
  STORE_LOGO_MAX_SIZE,
  STORE_LOGO_MIN_SIZE,
  STORE_LOGO_RECOMMENDED_SIZE,
} from "@/lib/store-logo/constants";

export function isSquareAspectRatio(
  width: number,
  height: number,
  tolerance = STORE_LOGO_ASPECT_TOLERANCE,
): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return Math.abs(ratio - 1) <= tolerance;
}

export const STORE_LOGO_NON_SQUARE_WARNING =
  "La imagen no es cuadrada y podría verse recortada en la PWA, se recomienda relación 1:1";

export function validateStoreLogoDimensions(
  width: number,
  height: number,
):
  | { ok: true; warning?: string }
  | { ok: false; error: string } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, error: "No se pudieron leer las dimensiones de la imagen." };
  }

  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);

  if (minSide < STORE_LOGO_MIN_SIZE) {
    return {
      ok: false,
      error: `El logo es muy pequeño. Usa al menos ${STORE_LOGO_MIN_SIZE}×${STORE_LOGO_MIN_SIZE}px.`,
    };
  }

  if (maxSide > STORE_LOGO_MAX_SIZE) {
    return {
      ok: false,
      error: `El logo es muy grande. Usa como máximo ${STORE_LOGO_MAX_SIZE}×${STORE_LOGO_MAX_SIZE}px.`,
    };
  }

  const warnings: string[] = [];

  if (!isSquareAspectRatio(width, height)) {
    warnings.push(STORE_LOGO_NON_SQUARE_WARNING);
  } else if (
    width !== STORE_LOGO_RECOMMENDED_SIZE ||
    height !== STORE_LOGO_RECOMMENDED_SIZE
  ) {
    warnings.push(
      `Recomendado: ${STORE_LOGO_RECOMMENDED_SIZE}×${STORE_LOGO_RECOMMENDED_SIZE}px. La optimizaremos automáticamente para la PWA.`,
    );
  }

  return {
    ok: true,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

export function validateStoreLogoMimeType(mimeType: string): string | null {
  const normalized = mimeType.trim().toLowerCase();
  if (
    !(STORE_LOGO_ALLOWED_MIME_TYPES as readonly string[]).includes(normalized)
  ) {
    return "Usa PNG, JPG o WebP (preferible cuadrado, idealmente PNG).";
  }
  return null;
}
