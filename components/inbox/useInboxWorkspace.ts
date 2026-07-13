"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboxChannelFilter } from "@/lib/inbox/inbox-filters";
import {
  DEFAULT_INBOX_WORKSPACE,
  type InboxWorkspaceState,
  readInboxWorkspaceState,
  writeInboxWorkspaceState,
} from "@/lib/inbox/workspace-persistence";

type WorkspacePanel = "list" | "chat" | "context";

export function useInboxWorkspace() {
  const [state, setState] = useState<InboxWorkspaceState>(
    DEFAULT_INBOX_WORKSPACE,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readInboxWorkspaceState();
    if (saved) {
      setState(saved);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeInboxWorkspaceState(state);
  }, [hydrated, state]);

  const setPanelCollapsed = useCallback(
    (panel: WorkspacePanel, collapsed: boolean) => {
      setState((current) => {
        if (panel === "list") {
          return { ...current, listCollapsed: collapsed };
        }
        if (panel === "chat") {
          return { ...current, chatCollapsed: collapsed };
        }
        return { ...current, contextCollapsed: collapsed };
      });
    },
    [],
  );

  const setChannelFocus = useCallback((channelFocus: InboxChannelFilter) => {
    setState((current) => ({ ...current, channelFocus }));
  }, []);

  return {
    ...state,
    hydrated,
    setListCollapsed: (collapsed: boolean) =>
      setPanelCollapsed("list", collapsed),
    setChatCollapsed: (collapsed: boolean) =>
      setPanelCollapsed("chat", collapsed),
    setContextCollapsed: (collapsed: boolean) =>
      setPanelCollapsed("context", collapsed),
    setChannelFocus,
  };
}
