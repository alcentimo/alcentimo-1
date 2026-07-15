function base64ToBytes(fileBase64: string): Uint8Array {
  const binary = atob(fileBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  return new Blob([Uint8Array.from(bytes)], { type: mimeType });
}

function downloadBase64File(
  fileBase64: string,
  fileName: string,
  mimeType: string,
) {
  const blob = bytesToBlob(base64ToBytes(fileBase64), mimeType);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createPdfBlobFromBase64(fileBase64: string): Blob {
  return bytesToBlob(base64ToBytes(fileBase64), "application/pdf");
}

export function createPdfPreviewUrl(fileBase64: string): string {
  const blob = createPdfBlobFromBase64(fileBase64);
  return URL.createObjectURL(blob);
}

export function revokePdfPreviewUrl(url: string | null) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function openPdfPreviewInNewTab(previewUrl: string): boolean {
  const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

export function downloadExcelFile(fileBase64: string, fileName: string) {
  downloadBase64File(
    fileBase64,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

export function downloadPdfFile(fileBase64: string, fileName: string) {
  downloadBase64File(fileBase64, fileName, "application/pdf");
}

export function downloadCsvFile(fileBase64: string, fileName: string) {
  downloadBase64File(fileBase64, fileName, "text/csv;charset=utf-8");
}
