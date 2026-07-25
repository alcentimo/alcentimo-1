import { PC_BUILDER_SLOTS } from "@/lib/rubros/modules/tecnologia/pc-builder";

export function PCBuilderInventoryBanner() {
  return (
    <div
      className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/25"
      role="note"
    >
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Arma tu PC — clasifica tus componentes
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Al crear o editar un producto, asigna el slot de PC Builder o usa una
        categoría compatible. Los clientes solo verán stock real en la cotización.
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {PC_BUILDER_SLOTS.map((slot) => (
          <li
            key={slot.id}
            className="rounded-full border border-sky-200/80 bg-white px-2.5 py-0.5 text-[11px] font-medium text-sky-900 dark:border-sky-900/60 dark:bg-zinc-950/40 dark:text-sky-200"
          >
            {slot.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
