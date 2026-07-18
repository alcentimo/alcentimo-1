import { readFile } from "fs/promises";
import path from "path";

export async function readRootServiceWorkerScript(): Promise<string> {
  return readFile(path.join(process.cwd(), "public", "sw.js"), "utf8");
}

/** Rutas absolutas para que workbox cargue desde / cuando el SW vive en /c/{slug}/sw.js */
export function rewriteServiceWorkerForCatalogSubpath(script: string): string {
  return script.replace(/"\.\/workbox-/g, '"/workbox-');
}

export const SERVICE_WORKER_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};
