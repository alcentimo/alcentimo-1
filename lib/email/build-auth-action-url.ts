import type { EmailOtpType } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";

export interface BuildAuthConfirmUrlInput {
  tokenHash: string;
  type: EmailOtpType;
  next?: string;
}

/** Enlace de confirmación/restablecimiento compatible con /auth/confirm. */
export function buildAuthConfirmUrl(input: BuildAuthConfirmUrlInput): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const params = new URLSearchParams({
    token_hash: input.tokenHash,
    type: input.type,
  });

  if (input.next?.trim()) {
    const safeNext = input.next.trim();
    if (safeNext.startsWith("/") && !safeNext.startsWith("//")) {
      params.set("next", safeNext);
    }
  }

  return `${siteUrl}/auth/confirm?${params.toString()}`;
}
