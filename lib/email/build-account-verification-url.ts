import { getSiteUrl } from "@/lib/site-url";

export function buildAccountVerificationPageUrl(input: {
  email: string;
  next?: string;
}): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const params = new URLSearchParams({
    email: input.email.trim().toLowerCase(),
  });

  if (input.next?.trim()) {
    const safeNext = input.next.trim();
    if (safeNext.startsWith("/") && !safeNext.startsWith("//")) {
      params.set("next", safeNext);
    }
  }

  return `${siteUrl}/dashboard/verificar-cuenta?${params.toString()}`;
}
