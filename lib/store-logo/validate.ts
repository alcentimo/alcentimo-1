import {
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

export function validateStoreLogoDimensions(
  width: number,
  height: number,
):
  | { ok: true; warning?: string }
  | { ok: false; error: string } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, error: "No se pudieron leer las dimensiones de la imagen." };
  }

  if (!isSquareAspectRatio(width, height)) {
    return {
      ok: false,
      error: "El logo debe ser cuadrado (relación 1:1). Recorta la imagen antes de subirla.",
    };
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

  if (width !== STORE_LOGO_RECOMMENDED_SIZE || height !== STORE_LOGO_RECOMMENDED_SIZE) {
    return {
      ok: true,
      warning: `Recomendado: ${STORE_LOGO_RECOMMENDED_SIZE}×${STORE_LOGO_RECOMMENDED_SIZE}px. La optimizaremos automáticamente para la PWA.`,
    };
  }

  return { ok: true };
}

export function validateStoreLogoMimeType(mimeType: string): string | null {
  if (mimeType !== "image/png") {
    return "Usa formato PNG con fondo transparente.";
  }
  return null;
}
