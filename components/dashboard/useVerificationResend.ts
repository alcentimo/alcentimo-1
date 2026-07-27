"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSignupVerificationResendStatusAction,
  resendSignupVerificationCodeAction,
} from "@/lib/auth/auth-email-actions";
import {
  formatCountdownClock,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_RESEND_MAX_CONSECUTIVE,
} from "@/lib/auth/verification-resend-ui";

interface UseVerificationResendOptions {
  email: string;
  nextPath?: string | null;
  /** Tras registro inicial: iniciar cooldown de inmediato en pantalla. */
  freshSignup?: boolean;
}

export function useVerificationResend({
  email,
  nextPath,
  freshSignup = false,
}: UseVerificationResendOptions) {
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    freshSignup ? VERIFICATION_RESEND_COOLDOWN_SECONDS : 0,
  );
  const [blockedSeconds, setBlockedSeconds] = useState(0);
  const [resendsRemaining, setResendsRemaining] = useState(
    VERIFICATION_RESEND_MAX_CONSECUTIVE,
  );
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const syncFromServer = useCallback(async () => {
    const status = await getSignupVerificationResendStatusAction({ email });
    setCooldownSeconds((current) =>
      Math.max(current, status.cooldownSeconds),
    );
    setBlockedSeconds(status.blockedSeconds);
    setResendsRemaining(status.resendsRemaining);
    setStatusLoaded(true);
  }, [email]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
      setBlockedSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (current > 0 && next === 0) {
          void syncFromServer();
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [syncFromServer]);

  const canResend =
    statusLoaded &&
    !resending &&
    cooldownSeconds === 0 &&
    blockedSeconds === 0 &&
    resendsRemaining > 0;

  const resend = useCallback(async () => {
    setResendError(null);
    setResendNotice(null);
    setResending(true);

    const result = await resendSignupVerificationCodeAction({
      email,
      nextPath,
    });

    setResending(false);

    if (result.ok) {
      setResendNotice(result.notice);
      setCooldownSeconds(result.cooldownSeconds);
      setBlockedSeconds(result.blockedSeconds);
      setResendsRemaining(result.resendsRemaining);
      return;
    }

    setResendError(result.error);
    if (result.cooldownSeconds != null) {
      setCooldownSeconds(result.cooldownSeconds);
    }
    if (result.blockedSeconds != null) {
      setBlockedSeconds(result.blockedSeconds);
    }
    if (result.resendsRemaining != null) {
      setResendsRemaining(result.resendsRemaining);
    }
  }, [email, nextPath]);

  const countdownLabel =
    blockedSeconds > 0
      ? formatCountdownClock(blockedSeconds)
      : cooldownSeconds > 0
        ? formatCountdownClock(cooldownSeconds)
        : null;

  return {
    canResend,
    resending,
    resendNotice,
    resendError,
    resendsRemaining,
    cooldownSeconds,
    blockedSeconds,
    countdownLabel,
    resend,
  };
}
