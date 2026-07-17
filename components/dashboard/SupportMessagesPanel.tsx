"use client";

import { useMemo, useState, useTransition } from "react";
import type { SupportMessage, SupportMessageStatus } from "@/lib/database.types";
import { updateSupportMessageStatusAction } from "@/lib/support/actions";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<SupportMessageStatus, string> = {
  pendiente: "Pendiente",
  atendido: "Atendido",
  cerrado: "Cerrado",
};

const STATUS_CLASS: Record<SupportMessageStatus, string> = {
  pendiente:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  atendido:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  cerrado:
    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
};

function formatSupportDate(iso: string): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface SupportMessagesPanelProps {
  initialMessages: SupportMessage[];
}

export function SupportMessagesPanel({
  initialMessages,
}: SupportMessagesPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<SupportMessageStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    return messages.filter((item) => item.status === filter);
  }, [filter, messages]);

  const counts = useMemo(() => {
    return messages.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { pendiente: 0, atendido: 0, cerrado: 0 } as Record<
        SupportMessageStatus,
        number
      >,
    );
  }, [messages]);

  function handleStatusChange(messageId: string, status: SupportMessageStatus) {
    setError(null);
    setUpdatingId(messageId);
    startTransition(async () => {
      const result = await updateSupportMessageStatusAction(messageId, status);
      setUpdatingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === messageId ? { ...item, status } : item,
        ),
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pendiente", "atendido", "cerrado"] as const).map((key) => {
          const label =
            key === "all"
              ? `Todos (${messages.length})`
              : `${STATUS_LABELS[key]} (${counts[key]})`;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="card-panel py-12 text-center">
          <p className="text-sm text-zinc-500">No hay mensajes en esta categoría.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id} className="card-panel space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.email}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatSupportDate(item.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    STATUS_CLASS[item.status],
                  )}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {item.message}
              </p>

              <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                {(["pendiente", "atendido", "cerrado"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      pending || updatingId === item.id || item.status === status
                    }
                    onClick={() => handleStatusChange(item.id, status)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      item.status === status
                        ? STATUS_CLASS[status]
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
