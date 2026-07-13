"use client";

import { Search } from "lucide-react";
import type { InboxListFilters, InboxSmartTab } from "@/lib/inbox/inbox-filters";

interface InboxFilterBarProps {
  filters: InboxListFilters;
  onFiltersChange: (filters: InboxListFilters) => void;
  reviewCount: number;
  activeCount: number;
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

export function InboxFilterBar({
  filters,
  onFiltersChange,
  reviewCount,
  activeCount,
}: InboxFilterBarProps) {
  return (
    <div className="fb-inbox-filter-bar">
      <div className="fb-inbox-smart-tabs" role="tablist" aria-label="Filtros de bandeja">
        {SMART_TABS.map((tab) => {
          const isActive = filters.smartTab === tab.key;
          const count = tab.key === "review" ? reviewCount : activeCount;

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
              <span className="fb-inbox-smart-tab-count">{count}</span>
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
          placeholder="Buscar cliente o mensaje…"
          className="fb-inbox-search-input"
        />
      </label>
    </div>
  );
}
