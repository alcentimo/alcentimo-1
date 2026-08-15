import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SupplierRegisterPanel } from "@/components/supplier/SupplierRegisterPanel";

export const metadata = {
  title: "Registro de proveedores | Alcéntimo",
  description:
    "Regístrate como proveedor o mayorista y sube tu catálogo al marketplace de dropshipping.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProveedorRegistroPage() {
  return (
    <AuthPageShell
      sectionLabel="Proveedores"
      title="Regístrate como mayorista"
      description="Sube tu catálogo una vez y llega a tiendas listas para vender tus productos."
    >
      <SupplierRegisterPanel />
    </AuthPageShell>
  );
}
