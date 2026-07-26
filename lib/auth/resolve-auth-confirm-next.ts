import type { EmailOtpType } from "@supabase/supabase-js";

export const AUTH_CONFIRM_RESET_NEXT = "/dashboard/restablecer-contrasena";
export const AUTH_CONFIRM_SIGNUP_NEXT = "/onboarding";

export function resolveAuthConfirmNext(
  type: EmailOtpType | null | undefined,
  nextParam: string | null | undefined,
): string {
  if (type === "recovery") {
    return AUTH_CONFIRM_RESET_NEXT;
  }

  if (nextParam?.trim()) {
    const trimmed = nextParam.trim();
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }
  }

  return AUTH_CONFIRM_SIGNUP_NEXT;
}

export function resolveAuthConfirmErrorPath(
  type: EmailOtpType | null | undefined,
): string {
  if (type === "recovery") {
    return "/dashboard/recuperar-contrasena";
  }

  return "/dashboard/verificar-cuenta";
}
