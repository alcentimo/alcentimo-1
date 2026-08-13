"use client";

import { ChevronDown, Lock } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import type {
  SettingsMobileNavGroup,
} from "@/components/dashboard/settings/SettingsMobileNav";

export type {
  SettingsMobileNavGroup,
  SettingsMobileNavItem,
} from "@/components/dashboard/settings/SettingsMobileNav";

interface SettingsMobileDropdownProps {
  groups: SettingsMobileNavGroup[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

/** Dropdown compacto (p. ej. ajustes de cuenta en sheet). */
export function SettingsMobileDropdown({
  groups,
  activeId,
  onChange,
  ariaLabel = "Sección de configuración",
}: SettingsMobileDropdownProps) {
  const activeItem =
    groups.flatMap((group) => group.items).find((item) => item.id === activeId) ??
    groups[0]?.items[0];
  const ActiveIcon = activeItem?.icon;

  return (
    <div className="settings-mobile-nav lg:hidden">
      <p className="settings-mobile-nav-label">{ariaLabel}</p>
      <DropdownMenu
        className="w-full"
        align="start"
        menuClassName="settings-mobile-nav-menu"
        trigger={
          <button
            type="button"
            className="settings-mobile-nav-trigger"
            aria-label={`${ariaLabel}: ${activeItem?.label ?? ""}`}
            aria-haspopup="menu"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {ActiveIcon ? (
                <ActiveIcon
                  className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                {activeItem?.label ?? "Elegir sección"}
              </span>
              {activeItem?.proLocked ? (
                <span className="settings-mobile-nav-pro-badge">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Pro
                </span>
              ) : null}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
              aria-hidden="true"
            />
          </button>
        }
      >
        {(close) => (
          <div className="settings-mobile-nav-menu-inner">
            {groups.map((group) => (
              <div key={group.label} className="settings-mobile-nav-group">
                <p className="settings-mobile-nav-group-label">{group.label}</p>
                <ul className="settings-mobile-nav-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="menuitem"
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "settings-mobile-nav-option",
                            isActive && "settings-mobile-nav-option-active",
                          )}
                          onClick={() => {
                            onChange(item.id);
                            close();
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {item.label}
                          </span>
                          {item.proLocked ? (
                            <span className="settings-mobile-nav-pro-badge">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Pro
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DropdownMenu>
    </div>
  );
}
