import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const GIFT_CARD_RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera un momento e inténtalo de nuevo.";

function formatRetryMessage(retryAfterSeconds: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  if (seconds < 60) {
    return `Demasiados intentos. Espera ${seconds} segundo${seconds === 1 ? "" : "s"} e inténtalo de nuevo.`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Demasiados intentos. Espera ${minutes} minuto${minutes === 1 ? "" : "s"} e inténtalo de nuevo.`;
}

function hashSubject(kind: "ip" | "user", value: string): string {
  const digest = createHash("sha256").update(`${kind}:${value}`).digest("hex");
  return `${kind}:${digest.slice(0, 32)}`;
}

function firstForwardedIp(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first.slice(0, 64) : null;
}

async function resolveAttemptSubjects(): Promise<string[]> {
  const subjects: string[] = [];

  try {
    const headerStore = await headers();
    const ip =
      firstForwardedIp(headerStore.get("cf-connecting-ip")) ||
      firstForwardedIp(headerStore.get("x-real-ip")) ||
      firstForwardedIp(headerStore.get("x-forwarded-for")) ||
      "unknown";
    subjects.push(hashSubject("ip", ip));
  } catch {
    subjects.push(hashSubject("ip", "unknown"));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      subjects.push(hashSubject("user", user.id));
    }
  } catch {
    // Invitado o sesión no disponible: solo IP.
  }

  return subjects;
}

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    message.includes("gift_card_attempt_limits") ||
    message.includes("consume_gift_card_rate_limit") ||
    message.includes("does not exist")
  );
}

/**
 * Consume un intento de canje/validación. Debe llamarse ANTES de consultar
 * si el código existe, para no filtrar validez bajo fuerza bruta.
 */
export async function consumeGiftCardRateLimit(
  storeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let subjects: string[];
  try {
    subjects = await resolveAttemptSubjects();
  } catch {
    return { ok: false, error: GIFT_CARD_RATE_LIMIT_MESSAGE };
  }

  const admin = createAdminClient();

  for (const subject of subjects) {
    const { data, error } = await admin.rpc(
      "consume_gift_card_rate_limit" as never,
      {
        p_store_id: storeId,
        p_subject: subject,
      } as never,
    );

    if (error) {
      if (isMissingRelation(error)) {
        return { ok: true };
      }
      console.error("[gift-card-rate-limit] consume", error.message);
      return { ok: false, error: GIFT_CARD_RATE_LIMIT_MESSAGE };
    }

    const result = data as {
      allowed?: boolean;
      retry_after_seconds?: number;
    } | null;

    if (!result?.allowed) {
      return {
        ok: false,
        error: formatRetryMessage(Number(result?.retry_after_seconds ?? 30)),
      };
    }
  }

  return { ok: true };
}

/** Cuenta un código inválido o rechazado hacia el tope de fallos consecutivos. */
export async function recordGiftCardAttemptFailure(storeId: string): Promise<void> {
  let subjects: string[] = [];
  try {
    subjects = await resolveAttemptSubjects();
  } catch {
    return;
  }

  const admin = createAdminClient();
  for (const subject of subjects) {
    const { error } = await admin.rpc(
      "record_gift_card_attempt_failure" as never,
      {
        p_store_id: storeId,
        p_subject: subject,
      } as never,
    );
    if (error && !isMissingRelation(error)) {
      console.error("[gift-card-rate-limit] failure", error.message);
    }
  }
}
