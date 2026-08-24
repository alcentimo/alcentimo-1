export default function SupplierPublicCatalogNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Vitrina no disponible
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Este proveedor no tiene la vitrina pública habilitada o el enlace no
        existe.
      </p>
    </div>
  );
}
