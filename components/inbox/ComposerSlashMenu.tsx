"use client";

import { useEffect, useRef } from "react";
import type {
  ComposerCommand,
  ComposerCommandGroup,
} from "@/lib/inbox/composer-catalog-types";

interface ComposerSlashMenuProps {
  groups: ComposerCommandGroup[];
  flatCommands: ComposerCommand[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: ComposerCommand) => void;
}

export function ComposerSlashMenu({
  groups,
  flatCommands,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: ComposerSlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeId = flatCommands[activeIndex]?.id;

  useEffect(() => {
    const activeElement = listRef.current?.querySelector(
      `[data-command-id="${activeId}"]`,
    ) as HTMLElement | undefined;

    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  if (flatCommands.length === 0) {
    return (
      <div
        className="composer-slash-menu"
        role="listbox"
        aria-label="Comandos rápidos"
      >
        <p className="composer-slash-menu-empty">Sin coincidencias</p>
      </div>
    );
  }

  let runningIndex = 0;

  return (
    <div
      ref={listRef}
      className="composer-slash-menu"
      role="listbox"
      aria-label="Comandos rápidos"
    >
      {groups.map((group) => (
        <section key={group.id} className="composer-slash-menu-section">
          <h4 className="composer-slash-menu-category">{group.label}</h4>
          <ul className="composer-slash-menu-list">
            {group.items.map((command) => {
              const itemIndex = runningIndex;
              const isActive = itemIndex === activeIndex;
              runningIndex += 1;

              return (
                <li key={command.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    data-command-id={command.id}
                    aria-selected={isActive}
                    className={`composer-slash-menu-item ${
                      isActive ? "composer-slash-menu-item--active" : ""
                    }`}
                    onMouseEnter={() => onActiveIndexChange(itemIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(command)}
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="composer-slash-menu-item-label">
                        {command.label}
                      </span>
                      <span className="composer-slash-menu-item-desc">
                        {command.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
