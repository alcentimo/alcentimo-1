/** Skeleton discreto del formulario mientras hidrata AuthPanel (useSearchParams). */
export function AuthFormSkeleton() {
  return (
    <div
      className="auth-form-skeleton space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-hidden="true"
    >
      <div className="mx-auto h-9 w-full max-w-[220px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40" />
      <div className="mx-auto h-4 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
