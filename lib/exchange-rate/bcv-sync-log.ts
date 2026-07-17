type BcvSyncLogLevel = "info" | "warn" | "error";

/** Logging estructurado para sincronización BCV (Vercel + scripts locales). */
export function logBcvSync(
  phase: string,
  data?: Record<string, unknown>,
  level: BcvSyncLogLevel = "info",
): void {
  const payload = {
    ts: new Date().toISOString(),
    phase,
    ...data,
  };

  const line = `[bcv-sync] ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
