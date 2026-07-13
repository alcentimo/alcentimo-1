"use client";

import { Search } from "lucide-react";
import type { InboxListFilters, InboxSmartTab } from "@/lib/inbox/inbox-filters";
import { ImmersiveModeToggle } from "@/components/inbox/ImmersiveModeToggle";
import { ConversationList } from "@/components/inbox/ConversationList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InboxConversationSidebarProps {
  filters: InboxListFilters;
  onFiltersChange: (filters: InboxListFilters) => void;
  isSynced?: boolean;
}

const SMART_TABS: { key: InboxSmartTab; label: string }[] = [
  { key: "review", label: "Por revisar" },
  { key: "active", label: "En curso" },
];

function updateFilter<K extends keyof InboxListFilters>(
  current: InboxListFilters,
  key: K,
  value: InboxListFilters[K],
): InboxListFilters {
  return { ...current, [key]: value };
}

export function InboxConversationSidebar({
  filters,
  onFiltersChange,
  isSynced = false,
}: InboxConversationSidebarProps) {
  return (
    <div className="inbox-pro-sidebar">
      <header className="inbox-pro-sidebar-header">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="inbox-pro-sidebar-title">Mensajes</h1>
            <p className="inbox-pro-sidebar-subtitle">Bandeja de Messenger</p>
          </div>
          <ImmersiveModeToggle />
        </div>

        {isSynced && (
          <Badge variant="success" className="mt-3 gap-1.5">
            <span className="inbox-pro-sync-dot" aria-hidden="true" />
            Sincronizado
          </Badge>
        )}
      </header>

      <div className="inbox-pro-sidebar-controls">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.searchQuery}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(filters, "searchQuery", event.target.value),
              )
            }
            placeholder="Buscar conversaciones…"
            className="h-10 pl-9"
          />
        </div>

        <div
          className="inbox-pro-tabs"
          role="tablist"
          aria-label="Filtrar conversaciones"
        >
          {SMART_TABS.map((tab) => {
            const isActive = filters.smartTab === tab.key;

            return (
              <Button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={`inbox-pro-tab ${isActive ? "inbox-pro-tab--active" : ""}`}
                onClick={() =>
                  onFiltersChange(updateFilter(filters, "smartTab", tab.key))
                }
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="inbox-pro-sidebar-list">
        <ConversationList />
      </div>
    </div>
  );
}
