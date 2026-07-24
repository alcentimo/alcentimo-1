export function isMobileCameraDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return coarse || mobileUa;
}

export function isCameraApiSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function hasVideoInputDevice(): Promise<boolean> {
  if (!isCameraApiSupported()) return false;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

export function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return "No se detectó una cámara web conectada.";
    }
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return "Permiso de cámara denegado. Actívalo en la configuración del navegador.";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.";
    }
  }

  return "No se pudo acceder a la cámara. Prueba seleccionando una foto de tu galería.";
}
