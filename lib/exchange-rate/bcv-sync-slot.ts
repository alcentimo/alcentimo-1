import { getVenezuelaHour } from "@/lib/exchange-rate/sync-date";
import type { BcvSyncSlot } from "@/lib/exchange-rate/sync-bcv-run";

const VALID_SLOTS = new Set<BcvSyncSlot>([
  "midnight",
  "morning",
  "midday",
  "retry",
  "afternoon",
  "manual",
  "autoheal",
]);

/** Infiere el slot según la hora de Venezuela. */
export function resolveBcvSyncSlotFromHour(hour: number): BcvSyncSlot {
  if (hour < 6) return "midnight";
  if (hour < 9) return "morning";
  if (hour < 12) return "midday";
  if (hour < 14) return "retry";
  return "afternoon";
}

export function parseBcvSyncSlotFromRequest(request: Request): BcvSyncSlot {
  const slot = new URL(request.url).searchParams.get("slot");
  if (slot && VALID_SLOTS.has(slot as BcvSyncSlot)) {
    return slot as BcvSyncSlot;
  }
  return resolveBcvSyncSlotFromHour(getVenezuelaHour());
}

export function scheduleNoteForBcvSlot(slot: BcvSyncSlot): string {
  if (slot === "morning") return "06:00 America/Caracas (UTC 10:00)";
  if (slot === "midday") return "09:00 America/Caracas (UTC 13:00)";
  if (slot === "retry") return "12:00 America/Caracas (UTC 16:00)";
  if (slot === "afternoon") return "14:00 America/Caracas (UTC 18:00)";
  if (slot === "autoheal") return "autoheal (dashboard)";
  if (slot === "manual") return "manual";
  return "01:00 America/Caracas (UTC 05:00)";
}
