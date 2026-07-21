function SkeletonRow({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <div className="inventory-mobile-card animate-pulse">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-8 w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="animate-pulse">
      <td className="inventory-td w-24">
        <div className="mx-auto h-4 w-8 rounded bg-zinc-200 dark:bg-zinc-800" />
      </td>
      <td className="inventory-td w-12">
        <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </td>
      <td className="inventory-td">
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </td>
      <td className="inventory-td">
        <div className="h-8 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </td>
      <td className="inventory-td">
        <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
      </td>
      <td className="inventory-td">
        <div className="ml-auto h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </td>
    </tr>
  );
}

interface InventoryListSkeletonProps {
  rows?: number;
  showReorderColumn?: boolean;
}

export function InventoryListSkeleton({
  rows = 5,
  showReorderColumn = true,
}: InventoryListSkeletonProps) {
  return (
    <>
      <div className="inventory-mobile-list space-y-3 p-3 md:hidden">
        {Array.from({ length: Math.min(rows, 3) }).map((_, index) => (
          <SkeletonRow key={`mobile-${index}`} mobile />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="inventory-table inventory-table-dense w-full">
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonRow key={`desktop-${index}`} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
