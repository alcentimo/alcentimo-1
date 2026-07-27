export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 120;
export const VERIFICATION_RESEND_MAX_CONSECUTIVE = 3;
export const VERIFICATION_RESEND_BLOCK_SECONDS = 15 * 60;

export function formatCountdownClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
