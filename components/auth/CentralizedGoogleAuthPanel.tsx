"use client";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface CentralizedGoogleAuthPanelProps {
  nextPath: string;
  storeSlug?: string;
  orderId?: string;
}

export function CentralizedGoogleAuthPanel({
  nextPath,
  storeSlug,
  orderId,
}: CentralizedGoogleAuthPanelProps) {
  return (
    <GoogleSignInButton
      postAuthPath={nextPath}
      storeSlug={storeSlug}
      orderId={orderId}
      skipCentralizedRedirect
      className="mx-auto max-w-md"
      buttonClassName="rounded-[10px] border-zinc-200/80 py-3.5 font-semibold shadow-[0_1px_2px_rgba(24,24,27,0.04)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
    />
  );
}
