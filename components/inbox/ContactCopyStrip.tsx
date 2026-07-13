"use client";

import { useState } from "react";
import { Check, Mail, Phone } from "lucide-react";

interface ContactCopyStripProps {
  phone: string | null;
  email: string | null;
}

export function ContactCopyStrip({ phone, email }: ContactCopyStripProps) {
  const [copiedKind, setCopiedKind] = useState<"phone" | "email" | null>(null);

  async function handleCopy(kind: "phone" | "email", value: string | null) {
    if (!value?.trim()) return;

    try {
      await navigator.clipboard.writeText(value.trim());
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1600);
    } catch {
      setCopiedKind(null);
    }
  }

  const items = [
    {
      kind: "phone" as const,
      icon: Phone,
      value: phone,
      label: "Teléfono",
    },
    {
      kind: "email" as const,
      icon: Mail,
      value: email,
      label: "Email",
    },
  ];

  return (
    <div className="inbox-contact-strip">
      {items.map((item) => {
        const Icon = item.icon;
        const canCopy = Boolean(item.value?.trim());
        const isCopied = copiedKind === item.kind;

        return (
          <button
            key={item.kind}
            type="button"
            disabled={!canCopy}
            onClick={() => handleCopy(item.kind, item.value)}
            className={`inbox-contact-strip-btn ${
              isCopied ? "inbox-contact-strip-btn--copied" : ""
            }`}
            title={
              canCopy
                ? `${item.label}: ${item.value} (clic para copiar)`
                : `${item.label} no disponible`
            }
            aria-label={
              canCopy ? `Copiar ${item.label}` : `${item.label} no disponible`
            }
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
