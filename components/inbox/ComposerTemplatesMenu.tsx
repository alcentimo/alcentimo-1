"use client";

import { useEffect, useRef } from "react";
import { INBOX_REPLY_TEMPLATES } from "@/lib/inbox/composer-templates";

interface ComposerTemplatesMenuProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (text: string) => void;
}

export function ComposerTemplatesMenu({
  open,
  onClose,
  onSelectTemplate,
}: ComposerTemplatesMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={menuRef} className="inbox-composer-menu" role="menu">
      {INBOX_REPLY_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelectTemplate(template.text);
            onClose();
          }}
          className="inbox-composer-menu-item"
        >
          <span className="min-w-0">
            <span className="inbox-composer-menu-item-label">{template.label}</span>
            <span className="inbox-composer-menu-item-desc line-clamp-2">
              {template.text}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
