"use client";

import { ChevronRight, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SettingsMobileNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  /** Badge Pro (p. ej. Dominio bloqueado). */
  proLocked?: boolean;
};

export type SettingsMobileNavGroup = {
  label: string;
  items: SettingsMobileNavItem[];
};

interface SettingsMobileNavProps {
  groups: SettingsMobileNavGroup[];
  onSelect: (id: string) => void;
  ariaLabel?: string;
}

/**
 * Menú móvil tipo ajustes nativos: lista agrupada.
 * Al tocar una opción, el padre navega a la sub-vista.
 */
export function SettingsMobileNav({
  groups,
  onSelect,
  ariaLabel = "Menú de configuración",
}: SettingsMobileNavProps) {
  return (
    <nav className="settings-mobile-menu" aria-label={ariaLabel}>
      {groups.map((group) => (
        <section key={group.label} className="settings-mobile-menu-group">
          <h2 className="settings-mobile-menu-group-label">{group.label}</h2>
          <ul className="settings-mobile-menu-list">
            {group.items.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === group.items.length - 1;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "settings-mobile-menu-row",
                      !isLast && "settings-mobile-menu-row-divider",
                    )}
                    onClick={() => onSelect(item.id)}
                  >
                    <span className="settings-mobile-menu-icon" aria-hidden="true">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    {item.proLocked ? (
                      <span className="settings-mobile-nav-pro-badge">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Pro
                      </span>
                    ) : null}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

interface SettingsMobileDetailHeaderProps {
  title: string;
  onBack: () => void;
  backLabel?: string;
}

/** Cabecera de sub-vista móvil con volver al menú de ajustes. */
export function SettingsMobileDetailHeader({
  title,
  onBack,
  backLabel = "Ajustes",
}: SettingsMobileDetailHeaderProps) {
  return (
    <header className="settings-mobile-detail-header">
      <button
        type="button"
        onClick={onBack}
        className="settings-mobile-detail-back"
        aria-label={`Volver a ${backLabel}`}
      >
        <ChevronRight
          className="h-4 w-4 shrink-0 -scale-x-100"
          aria-hidden="true"
        />
        <span>{backLabel}</span>
      </button>
      <h2 className="settings-mobile-detail-title">{title}</h2>
    </header>
  );
}
