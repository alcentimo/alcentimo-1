import type { InboxConversationStatus } from "@/lib/inbox/types";

export const CONVERSATION_STATUS_OPTIONS: {
  value: InboxConversationStatus;
  label: string;
}[] = [
  { value: "open", label: "Abierta" },
  { value: "pending", label: "En espera" },
  { value: "closed", label: "Resuelta" },
];

export function getConversationStatusLabel(
  status: InboxConversationStatus,
): string {
  return (
    CONVERSATION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

export function getConversationStatusTone(
  status: InboxConversationStatus,
): string {
  switch (status) {
    case "open":
      return "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/50";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50";
    case "closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50";
  }
}
