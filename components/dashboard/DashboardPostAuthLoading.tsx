/** Pantalla de transición inmediata tras login (antes del hard navigate). */
export function DashboardPostAuthLoading({
  message = "Entrando al panel…",
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400"
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-100">{message}</p>
      <p className="max-w-xs text-xs text-zinc-400">
        Un momento mientras preparamos tu catálogo.
      </p>
    </div>
  );
}
