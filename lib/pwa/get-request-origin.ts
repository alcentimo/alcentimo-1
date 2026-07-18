import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";

/** Origen real de la petición (Vercel/producción) para URLs absolutas del manifest PWA. */
export async function getRequestOrigin(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      headersList.get("host")?.split(",")[0]?.trim();

    if (!host) {
      return getSiteUrl();
    }

    const proto =
      headersList.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

    // Vercel redirige HTTP→HTTPS en el edge; el manifest/SW deben usar siempre https.
    const safeProto =
      process.env.NODE_ENV === "production" ? "https" : proto;

    return `${safeProto}://${host}`;
  } catch {
    return getSiteUrl();
  }
}
