"use client";

import { Search } from "lucide-react";
import type { InboxListFilters, InboxSmartTab } from "@/lib/inbox/inbox-filters";
import { ImmersiveModeToggle } from "@/components/inbox/ImmersiveModeToggle";

interface FbInboxTopBarProps {
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

export function FbInboxTopBar({
  filters,
  onFiltersChange,
  isSynced = false,
}: FbInboxTopBarProps) {
  return (
    <header className="fb-inbox-top-bar">
      <div className="fb-inbox-top-bar-brand">
        <ImmersiveModeToggle />
        <div className="min-w-0">
          <h1 className="fb-inbox-title">Bandeja de Facebook</h1>
          {isSynced && (
            <p className="fb-inbox-sync-indicator">
              <span className="fb-inbox-sync-dot" aria-hidden="true" />
              Sincronizado con Facebook
            </p>
          )}
        </div>
      </div>

      <div
        className="fb-inbox-top-bar-controls"
        role="toolbar"
        aria-label="Filtros de bandeja"
      >
        <div className="fb-inbox-smart-tabs" role="tablist" aria-label="Estado">
          {SMART_TABS.map((tab) => {
            const isActive = filters.smartTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  onFiltersChange(updateFilter(filters, "smartTab", tab.key))
                }
                className={`fb-inbox-smart-tab ${isActive ? "fb-inbox-smart-tab--active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <label className="fb-inbox-search">
          <Search className="fb-inbox-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={filters.searchQuery}
            onChange={(event) =>
              onFiltersChange(
                updateFilter(filters, "searchQuery", event.target.value),
              )
            }
            placeholder="Buscar…"
            className="fb-inbox-search-input"
          />
        </label>
      </div>
    </header>
  );
}
