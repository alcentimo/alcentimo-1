import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { buildAuthConfirmUrl } from "@/lib/email/build-auth-action-url";
import {
  sendEmailChangeConfirmationEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/lib/email/send-auth-email";

const RESET_PASSWORD_NEXT = "/dashboard/restablecer-contrasena";

interface SupabaseSendEmailHookPayload {
  user: {
    email?: string | null;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "magiclink"
      | "email_change"
      | "invite";
    site_url: string;
  };
}

function resolveNextPath(redirectTo: string | undefined): string | undefined {
  if (!redirectTo?.trim()) return undefined;
  try {
    const url = new URL(redirectTo);
    const next = url.searchParams.get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) {
      return next;
    }
    if (url.pathname.startsWith("/")) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      return redirectTo;
    }
  }
  return undefined;
}

function mapHookType(type: SupabaseSendEmailHookPayload["email_data"]["email_action_type"]): EmailOtpType {
  switch (type) {
    case "recovery":
      return "recovery";
    case "magiclink":
      return "magiclink";
    case "email_change":
      return "email_change";
    case "invite":
      return "invite";
    case "signup":
    default:
      return "signup";
  }
}

/**
 * Webhook opcional de Supabase Auth (Send Email Hook).
 * Configura Authentication → Hooks → Send Email apuntando a /api/auth/send-email.
 */
export async function POST(request: NextRequest) {
  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  if (!hookSecret) {
    return NextResponse.json(
      { error: "SEND_EMAIL_HOOK_SECRET no está configurada." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${hookSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let payload: SupabaseSendEmailHookPayload;
  try {
    payload = (await request.json()) as SupabaseSendEmailHookPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const email = payload.user.email?.trim().toLowerCase();
  const tokenHash = payload.email_data.token_hash?.trim();
  const actionType = payload.email_data.email_action_type;

  if (!email || !tokenHash) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const otpType = mapHookType(actionType);
  const nextPath =
    otpType === "recovery"
      ? RESET_PASSWORD_NEXT
      : resolveNextPath(payload.email_data.redirect_to);

  const actionUrl = buildAuthConfirmUrl({
    tokenHash,
    type: otpType,
    next: nextPath,
  });

  let result:
    | Awaited<ReturnType<typeof sendSignupConfirmationEmail>>
    | Awaited<ReturnType<typeof sendPasswordResetEmail>>;

  switch (actionType) {
    case "recovery":
      result = await sendPasswordResetEmail({ to: email, actionUrl });
      break;
    case "magiclink":
      result = await sendMagicLinkEmail({ to: email, actionUrl });
      break;
    case "email_change":
      result = await sendEmailChangeConfirmationEmail({ to: email, actionUrl });
      break;
    case "invite":
    case "signup":
    default:
      result = await sendSignupConfirmationEmail({ to: email, actionUrl });
      break;
  }

  if (!result.ok) {
    console.error("[api/auth/send-email]", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
