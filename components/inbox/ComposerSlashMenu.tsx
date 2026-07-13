"use client";

import { useEffect, useRef } from "react";
import type { ComposerCommand } from "@/lib/inbox/composer-commands";

interface ComposerSlashMenuProps {
  commands: ComposerCommand[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: ComposerCommand) => void;
}

export function ComposerSlashMenu({
  commands,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: ComposerSlashMenuProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (commands.length === 0) {
    return (
      <div className="composer-slash-menu" role="listbox" aria-label="Comandos rápidos">
        <p className="composer-slash-menu-empty">Sin coincidencias</p>
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      className="composer-slash-menu"
      role="listbox"
      aria-label="Comandos rápidos"
    >
      {commands.map((command, index) => {
        const Icon = command.icon;
        const isActive = index === activeIndex;

        return (
          <li key={command.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              className={`composer-slash-menu-item ${
                isActive ? "composer-slash-menu-item--active" : ""
              }`}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(command)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                  {command.label}
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {command.description}
                </span>
              </span>
              <kbd className="composer-slash-menu-kbd">↵</kbd>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
