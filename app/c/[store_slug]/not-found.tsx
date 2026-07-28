import Link from "next/link";

export default function CatalogNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        404
      </p>
      <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        Página no encontrada
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Este enlace del catálogo no existe o ya no está disponible.
      </p>
      <Link href="." className="btn-primary mt-6">
        Volver al catálogo
      </Link>
    </div>
  );
}
