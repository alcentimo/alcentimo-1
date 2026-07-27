import { createAdminClient } from "@/lib/supabase/admin";
import {
  VERIFICATION_RESEND_BLOCK_SECONDS,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_RESEND_MAX_CONSECUTIVE,
  type AuthEmailResendFlow,
} from "@/lib/auth/verification-resend-ui";

export {
  VERIFICATION_RESEND_BLOCK_SECONDS,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_RESEND_MAX_CONSECUTIVE,
} from "@/lib/auth/verification-resend-ui";
export {
  formatCountdownClock,
  type AuthEmailResendFlow,
} from "@/lib/auth/verification-resend-ui";

export interface VerificationResendStatus {
  canResend: boolean;
  cooldownSeconds: number;
  blockedSeconds: number;
  resendsRemaining: number;
  resendCount: number;
}

interface ResendLimitRow {
  email: string;
  flow: AuthEmailResendFlow;
  resend_count: number;
  last_resend_at: string | null;
  blocked_until: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function secondsUntil(isoDate: string | null | undefined, fromMs: number): number {
  if (!isoDate) return 0;
  const target = new Date(isoDate).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - fromMs) / 1000));
}

async function fetchLimitRow(
  email: string,
  flow: AuthEmailResendFlow,
): Promise<ResendLimitRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("auth_verification_resend_limits")
    .select("email, flow, resend_count, last_resend_at, blocked_until")
    .eq("email", email)
    .eq("flow", flow)
    .maybeSingle();

  if (error) {
    console.error("[verification-resend-limits] fetch", error.message);
    return null;
  }

  return data as ResendLimitRow | null;
}

async function upsertLimitRow(
  email: string,
  flow: AuthEmailResendFlow,
  patch: Partial<
    Pick<ResendLimitRow, "resend_count" | "last_resend_at" | "blocked_until">
  >,
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin.from("auth_verification_resend_limits").upsert(
    {
      email,
      flow,
      resend_count: patch.resend_count ?? 0,
      last_resend_at: patch.last_resend_at ?? null,
      blocked_until: patch.blocked_until ?? null,
      updated_at: now,
    },
    { onConflict: "email,flow" },
  );

  if (error) {
    console.error("[verification-resend-limits] upsert", error.message);
  }
}

function buildStatusFromRow(
  row: ResendLimitRow | null,
  nowMs: number = Date.now(),
): VerificationResendStatus {
  if (!row) {
    return {
      canResend: true,
      cooldownSeconds: 0,
      blockedSeconds: 0,
      resendsRemaining: VERIFICATION_RESEND_MAX_CONSECUTIVE,
      resendCount: 0,
    };
  }

  const blockedSeconds = secondsUntil(row.blocked_until, nowMs);
  if (blockedSeconds > 0) {
    return {
      canResend: false,
      cooldownSeconds: 0,
      blockedSeconds,
      resendsRemaining: 0,
      resendCount: row.resend_count,
    };
  }

  const cooldownSeconds = secondsUntil(
    row.last_resend_at
      ? new Date(
          new Date(row.last_resend_at).getTime() +
            VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000,
        ).toISOString()
      : null,
    nowMs,
  );

  const resendsRemaining = Math.max(
    0,
    VERIFICATION_RESEND_MAX_CONSECUTIVE - row.resend_count,
  );

  return {
    canResend: cooldownSeconds === 0 && resendsRemaining > 0,
    cooldownSeconds,
    blockedSeconds: 0,
    resendsRemaining,
    resendCount: row.resend_count,
  };
}

export async function getVerificationResendStatus(
  email: string,
  flow: AuthEmailResendFlow = "signup",
): Promise<VerificationResendStatus> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return buildStatusFromRow(null);
  }

  const row = await fetchLimitRow(normalized, flow);
  const nowMs = Date.now();

  if (row?.blocked_until && secondsUntil(row.blocked_until, nowMs) === 0) {
    await upsertLimitRow(normalized, flow, {
      resend_count: 0,
      last_resend_at: row.last_resend_at,
      blocked_until: null,
    });
    return buildStatusFromRow({
      ...row,
      resend_count: 0,
      blocked_until: null,
    });
  }

  return buildStatusFromRow(row, nowMs);
}

/** Marca envío inicial del correo (registro o reactivación) sin consumir un reenvío manual. */
export async function recordInitialVerificationEmailSent(
  email: string,
  flow: AuthEmailResendFlow = "signup",
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const row = await fetchLimitRow(normalized, flow);
  const nowIso = new Date().toISOString();

  await upsertLimitRow(normalized, flow, {
    resend_count: row?.resend_count ?? 0,
    last_resend_at: nowIso,
    blocked_until:
      row?.blocked_until &&
      secondsUntil(row.blocked_until, Date.now()) > 0
        ? row.blocked_until
        : null,
  });
}

export type VerificationResendGateResult =
  | { allowed: true; resendsRemaining: number }
  | {
      allowed: false;
      reason: "cooldown" | "blocked" | "limit";
      secondsRemaining: number;
      message: string;
    };

export function formatResendWaitMessage(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `Espera ${minutes} minuto${minutes === 1 ? "" : "s"} antes de intentar de nuevo.`;
  }
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `Espera ${mm}:${ss} antes de solicitar otro código.`;
}

export async function assertVerificationResendAllowed(
  email: string,
  flow: AuthEmailResendFlow = "signup",
): Promise<VerificationResendGateResult> {
  const status = await getVerificationResendStatus(email, flow);

  if (status.blockedSeconds > 0) {
    return {
      allowed: false,
      reason: "blocked",
      secondsRemaining: status.blockedSeconds,
      message: `Has alcanzado el límite de ${VERIFICATION_RESEND_MAX_CONSECUTIVE} reenvíos. ${formatResendWaitMessage(status.blockedSeconds)}`,
    };
  }

  if (status.cooldownSeconds > 0) {
    return {
      allowed: false,
      reason: "cooldown",
      secondsRemaining: status.cooldownSeconds,
      message: formatResendWaitMessage(status.cooldownSeconds),
    };
  }

  if (status.resendsRemaining <= 0) {
    return {
      allowed: false,
      reason: "limit",
      secondsRemaining: VERIFICATION_RESEND_BLOCK_SECONDS,
      message: `Has alcanzado el límite de ${VERIFICATION_RESEND_MAX_CONSECUTIVE} reenvíos. ${formatResendWaitMessage(VERIFICATION_RESEND_BLOCK_SECONDS)}`,
    };
  }

  return {
    allowed: true,
    resendsRemaining: status.resendsRemaining,
  };
}

export async function recordVerificationResendSuccess(
  email: string,
  flow: AuthEmailResendFlow = "signup",
): Promise<VerificationResendStatus> {
  const normalized = normalizeEmail(email);
  const now = new Date();
  const nowIso = now.toISOString();
  const row = (await fetchLimitRow(normalized, flow)) ?? {
    email: normalized,
    flow,
    resend_count: 0,
    last_resend_at: null,
    blocked_until: null,
  };

  const nextCount = row.resend_count + 1;
  const hitLimit = nextCount >= VERIFICATION_RESEND_MAX_CONSECUTIVE;

  await upsertLimitRow(normalized, flow, {
    resend_count: hitLimit ? 0 : nextCount,
    last_resend_at: nowIso,
    blocked_until: hitLimit
      ? new Date(
          now.getTime() + VERIFICATION_RESEND_BLOCK_SECONDS * 1000,
        ).toISOString()
      : null,
  });

  if (hitLimit) {
    return {
      canResend: false,
      cooldownSeconds: 0,
      blockedSeconds: VERIFICATION_RESEND_BLOCK_SECONDS,
      resendsRemaining: 0,
      resendCount: VERIFICATION_RESEND_MAX_CONSECUTIVE,
    };
  }

  return {
    canResend: false,
    cooldownSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
    blockedSeconds: 0,
    resendsRemaining: VERIFICATION_RESEND_MAX_CONSECUTIVE - nextCount,
    resendCount: nextCount,
  };
}

export async function clearVerificationResendLimits(
  email: string,
  flow: AuthEmailResendFlow = "signup",
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("auth_verification_resend_limits")
    .delete()
    .eq("email", normalized)
    .eq("flow", flow);

  if (error) {
    console.error("[verification-resend-limits] clear", error.message);
  }
}
