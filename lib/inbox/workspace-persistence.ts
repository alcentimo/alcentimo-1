import type { CSSProperties } from "react";
import type { InboxChannelFilter } from "@/lib/inbox/inbox-filters";

export const INBOX_WORKSPACE_STORAGE_KEY = "alcentimo-inbox-workspace-v1";

export interface InboxWorkspaceState {
  listCollapsed: boolean;
  chatCollapsed: boolean;
  contextCollapsed: boolean;
  channelFocus: InboxChannelFilter;
}

export const DEFAULT_INBOX_WORKSPACE: InboxWorkspaceState = {
  listCollapsed: false,
  chatCollapsed: false,
  contextCollapsed: false,
  channelFocus: "all",
};

const VALID_CHANNELS = new Set<InboxChannelFilter>(["all", "whatsapp"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readInboxWorkspaceState(): InboxWorkspaceState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(INBOX_WORKSPACE_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const channelFocus = parsed.channelFocus;
    const normalizedChannel =
      typeof channelFocus === "string" &&
      VALID_CHANNELS.has(channelFocus as InboxChannelFilter)
        ? (channelFocus as InboxChannelFilter)
        : DEFAULT_INBOX_WORKSPACE.channelFocus;

    return {
      listCollapsed: Boolean(parsed.listCollapsed),
      chatCollapsed: Boolean(parsed.chatCollapsed),
      contextCollapsed: Boolean(parsed.contextCollapsed),
      channelFocus: normalizedChannel,
    };
  } catch {
    return null;
  }
}

export function writeInboxWorkspaceState(state: InboxWorkspaceState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      INBOX_WORKSPACE_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Ignore quota or privacy errors.
  }
}

export function buildWorkspaceGridStyle(
  state: InboxWorkspaceState,
): CSSProperties {
  const listCol = state.listCollapsed ? "2.25rem" : "minmax(0,16rem)";
  const chatCol = state.chatCollapsed ? "2.25rem" : "minmax(0,1fr)";
  const contextCol = state.contextCollapsed ? "2.25rem" : "minmax(0,18rem)";

  return {
    "--ws-list-col": listCol,
    "--ws-chat-col": chatCol,
    "--ws-context-col": contextCol,
  } as CSSProperties;
}

export function isChannelFocusActive(channelFocus: InboxChannelFilter): boolean {
  return channelFocus !== "all";
}
