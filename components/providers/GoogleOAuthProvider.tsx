"use client";

import { GoogleOAuthProvider as ReactGoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";
import { getGoogleClientId } from "@/lib/auth/google-client-id";

export function GoogleOAuthProvider({ children }: { children: ReactNode }) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return children;
  }

  return (
    <ReactGoogleOAuthProvider clientId={clientId} locale="es">
      {children}
    </ReactGoogleOAuthProvider>
  );
}
