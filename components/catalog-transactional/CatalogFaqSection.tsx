"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { normalizeCatalogFaqSettings } from "@/lib/store-settings/catalog-faq";
import type { CatalogFaqSettings } from "@/lib/store-settings/types";

interface CatalogFaqSectionProps {
  faq?: CatalogFaqSettings | null;
  storeName?: string;
}

export function CatalogFaqSection({
  faq,
  storeName,
}: CatalogFaqSectionProps) {
  const settings = normalizeCatalogFaqSettings(faq);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!settings.enabled || settings.items.length === 0) {
    return null;
  }

  return (
    <section className="catalog-faq" aria-labelledby="catalog-faq-heading">
      <div className="catalog-faq-header">
        <h2 id="catalog-faq-heading" className="catalog-faq-title">
          Preguntas frecuentes
        </h2>
        <p className="catalog-faq-subtitle">
          {storeName
            ? `Respuestas rápidas de ${storeName}`
            : "Envíos, pagos y más"}
        </p>
      </div>

      <div className="catalog-faq-list">
        {settings.items.map((item) => {
          const isOpen = openId === item.id;
          const panelId = `catalog-faq-panel-${item.id}`;
          const buttonId = `catalog-faq-btn-${item.id}`;

          return (
            <div
              key={item.id}
              className={cn("catalog-faq-item", isOpen && "catalog-faq-item-open")}
            >
              <button
                type="button"
                id={buttonId}
                className="catalog-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <span className="catalog-faq-question">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "catalog-faq-chevron h-4 w-4 shrink-0",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className="catalog-faq-panel"
              >
                <p className="catalog-faq-answer">{item.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
