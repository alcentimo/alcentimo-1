"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { CatalogAssistantAvatarField } from "@/components/dashboard/settings/CatalogAssistantAvatarField";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { saveCatalogAssistantAvatarSettings } from "@/lib/settings/actions";
import { normalizeAssistantAvatarDraft } from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

interface CatalogAssistantAvatarPanelProps {
  initialAvatar: CatalogAssistantAvatarSettings | undefined;
  storeLogoUrl: string | null;
}

export function CatalogAssistantAvatarPanel({
  initialAvatar,
  storeLogoUrl,
}: CatalogAssistantAvatarPanelProps) {
  const [avatar, setAvatar] = useState(() =>
    normalizeAssistantAvatarDraft(initialAvatar),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSave] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAvatar(normalizeAssistantAvatarDraft(initialAvatar));
  }, [initialAvatar]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function persist(next: CatalogAssistantAvatarSettings) {
    setError(null);
    setSaved(false);

    startSave(async () => {
      const result = await saveCatalogAssistantAvatarSettings(next);
      if (result.error) {
        setError(result.error);
        setAvatar(normalizeAssistantAvatarDraft(initialAvatar));
        return;
      }

      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2200);
    });
  }

  function handleChange(next: CatalogAssistantAvatarSettings) {
    const draft = normalizeAssistantAvatarDraft(next);
    setAvatar(draft);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist(draft);
    }, 400);
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Avatar del Asistente de IA
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Así te ven tus clientes en el chat del catálogo público. Puedes usar
            el logo de la tienda o una foto personalizada.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SavingHint visible={isSaving} />
          {saved && !isSaving ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-300"
              role="status"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Guardado
            </span>
          ) : null}
        </div>
      </header>

      <CatalogAssistantAvatarField
        value={avatar}
        storeLogoUrl={storeLogoUrl}
        disabled={isSaving}
        onChange={handleChange}
      />

      {error ? (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
