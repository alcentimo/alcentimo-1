"use client";

/** Pitido corto al llegar un pedido (Web Audio; sin archivo). */
export function playOrderNotificationChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      frequency: number,
      start: number,
      duration: number,
      gainValue: number,
    ) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };

    playTone(880, now, 0.12, 0.08);
    playTone(1175, now + 0.11, 0.16, 0.07);

    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // Silencio si el navegador bloquea audio.
  }
}
