"use client";

import { useEffect, useRef } from "react";
import { Copy, Link2, Store } from "lucide-react";

interface ComposerPaymentMenuProps {
  open: boolean;
  storeSlug: string;
  onClose: () => void;
  onSelectSnippet: (snippet: string, activityLabel: string) => void;
}

export function ComposerPaymentMenu({
  open,
  storeSlug,
  onClose,
  onSelectSnippet,
}: ComposerPaymentMenuProps) {
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

  const storeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tienda/${storeSlug}`
      : `/tienda/${storeSlug}`;

  const options = [
    {
      id: "store-link",
      label: "Enlace de tienda",
      description: "Comparte el catálogo online",
      icon: Store,
      action: () => {
        onSelectSnippet(
          `Puedes ver todos nuestros productos y pagar aquí: ${storeUrl}`,
          "Link enviado",
        );
        onClose();
      },
    },
    {
      id: "payment-request",
      label: "Solicitar pago",
      description: "Mensaje para confirmar método",
      icon: Link2,
      action: () => {
        onSelectSnippet(
          "Te envío el enlace de pago seguro para completar tu pedido. ¿Prefieres transferencia, pago móvil o efectivo?",
          "Link de pago solicitado",
        );
        onClose();
      },
    },
    {
      id: "copy-store",
      label: "Copiar enlace",
      description: "Pégalo manualmente en el chat",
      icon: Copy,
      action: async () => {
        try {
          await navigator.clipboard.writeText(storeUrl);
        } catch {
          // Ignore clipboard errors in unsupported browsers.
        }
        onClose();
      },
    },
  ] as const;

  return (
    <div ref={menuRef} className="inbox-composer-menu" role="menu">
      {options.map((option) => {
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            onClick={option.action}
            className="inbox-composer-menu-item"
          >
            <span className="inbox-composer-menu-item-icon">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="inbox-composer-menu-item-label">{option.label}</span>
              <span className="inbox-composer-menu-item-desc">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
